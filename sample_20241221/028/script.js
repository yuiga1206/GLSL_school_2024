
/** ===========================================================================
 * 1999 年に発表された Stable fluids という論文、またそれに続く 2003 年に発表さ
 * れた Real-Time Fluid Dynamics for Games という論文内で説明されている実装を、
 * GLSL を使って実装したサンプルです。
 * 元の論文では C 言語などで、つまり CPU でこれを計算することを前提とした参考例
 * が掲載されていたりするのですが、ここではそれを GLSL で行っています。
 * 使っているシェーダの量やフレームバッファの量が多く、愚直に実装した形ではかな
 * り全体像がわかりにくくなってしまうのですが、なにかの参考になればという思いで
 * 配布します。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { Pane } from '../lib/tweakpane-4.0.0.min.js';

const PIXEL_RATIO = 2;        // 解像度に対する係数
const DIFFUSE_ITERATION = 1;  // 拡散計算のイテレーション回数
const PROJECT_ITERATION = 16; // 質量計算のイテレーション回数

window.addEventListener('DOMContentLoaded', async () => {
  const app = new WebGLApp();
  app.init('webgl-canvas');
  await app.load();
  app.setup();
  app.render();
}, false);

class WebGLApp {
  /**
   * @constructor
   */
  constructor() {
    // 汎用的なプロパティ
    this.canvas = null;
    this.gl = null;
    this.running = false;
    this.bufferWidth = 0;
    this.bufferHeight = 0;

    // this を固定するためメソッドをバインドする
    this.render = this.render.bind(this);

    // 各種パラメータや uniform 変数用
    this.uTimeStep = 0.005;
    this.uForceRadius = 0.01;
    this.uForceIntensity = 50.0;
    this.uForceAttenuation = 0.01;
    this.uDiffuse = 0.0;
    this.uAdditionalVelocity = 0.0;
    this.uMouse = [0.0, 0.0];
    this.uMouseDirection = [0.0, 0.0];

    this.isPress = false;
    this.isMove = false;
    this.isAdditional = false;
    this.isDrawDensity = true;
    this.previousMouse = [0, 0];
    this.mouseLength = 1.0;

    // tweakpane を初期化
    const pane = new Pane();
    pane.addBinding({'draw-density': this.isDrawDensity}, 'draw-density')
    .on('change', (v) => {
      this.isDrawDensity = v.value;
    });
    pane.addBinding({'additional-velocity': this.isAdditional}, 'additional-velocity')
    .on('change', (v) => {
      this.isAdditional = v.value;
      this.uAdditionalVelocity = v.value === true ? 1.0 : 0.0;
    });
    pane.addBlade({
      view: 'slider',
      label: 'global-timestep',
      min: 0.001,
      max: 0.01,
      value: this.uTimeStep,
    })
    .on('change', (v) => {
      this.uTimeStep = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'force-radius',
      min: 0.001,
      max: 0.1,
      value: this.uForceRadius,
    })
    .on('change', (v) => {
      this.uForceRadius = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'force-intensity',
      min: 1.0,
      max: 100.0,
      value: this.uForceIntensity,
    })
    .on('change', (v) => {
      this.uForceIntensity = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'force-attenuation',
      min: 0.0,
      max: 0.1,
      value: this.uForceAttenuation,
    })
    .on('change', (v) => {
      this.uForceAttenuation = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'diffuse-intensity',
      min: 0.0,
      max: 1.0,
      value: this.uDiffuse,
    })
    .on('change', (v) => {
      this.uDiffuse = v.value;
    });
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    // 汎用頂点シェーダ
    const base = await WebGLUtility.loadFile('./shader/base.vert');

    const resetVelocity   = await WebGLUtility.loadFile('./shader/resetVelocity.frag');
    const resetDensity    = await WebGLUtility.loadFile('./shader/resetDensity.frag');
    const resetProject    = await WebGLUtility.loadFile('./shader/resetProject.frag');
    const diffuseVelocity = await WebGLUtility.loadFile('./shader/diffuseVelocity.frag');
    const diffuseDensity  = await WebGLUtility.loadFile('./shader/diffuseDensity.frag');
    const advectVelocity  = await WebGLUtility.loadFile('./shader/advectVelocity.frag');
    const advectDensity   = await WebGLUtility.loadFile('./shader/advectDensity.frag');
    const projectBegin    = await WebGLUtility.loadFile('./shader/projectBegin.frag');
    const projectLoop     = await WebGLUtility.loadFile('./shader/projectLoop.frag');
    const projectEnd      = await WebGLUtility.loadFile('./shader/projectEnd.frag');
    const forceVelocity   = await WebGLUtility.loadFile('./shader/forceVelocity.frag');
    const renderVelocity  = await WebGLUtility.loadFile('./shader/renderVelocity.frag');
    const renderDensity   = await WebGLUtility.loadFile('./shader/renderDensity.frag');

    this.resetVelocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: resetVelocity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [],
      type: [],
    });
    this.resetDensityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: resetDensity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [],
      type: [],
    });
    this.resetProjectShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: resetProject,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [],
      type: [],
    });
    this.diffuseVelocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: diffuseVelocity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
        'deltaTime',
        'diffuse',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1f',
        'uniform1f',
      ],
    });
    this.diffuseDensityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: diffuseDensity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'densityTexture',
        'deltaTime',
        'diffuse',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1f',
        'uniform1f',
      ],
    });
    this.advectVelocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: advectVelocity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
        'deltaTime',
        'attenuation',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1f',
        'uniform1f',
      ],
    });
    this.advectDensityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: advectDensity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
        'densityTexture',
        'deltaTime',
        'additionalVelocity',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1i',
        'uniform1f',
        'uniform1f',
      ],
    });
    this.projectBeginShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: projectBegin,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
      ],
    });
    this.projectLoopShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: projectLoop,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'projectTexture',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
      ],
    });
    this.projectEndShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: projectEnd,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
        'projectTexture',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1i',
      ],
    });
    this.forceVelocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: forceVelocity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'resolution',
        'velocityTexture',
        'deltaTime',
        'forceRadius',
        'forceIntensity',
        'forceDirection',
        'forceOrigin',
      ],
      type: [
        'uniform2fv',
        'uniform1i',
        'uniform1f',
        'uniform1f',
        'uniform1f',
        'uniform2fv',
        'uniform2fv',
      ],
    });
    this.renderVelocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: renderVelocity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'velocityTexture',
      ],
      type: [
        'uniform1i',
      ],
    });
    this.renderDensityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: base,
      fragmentShaderSource: renderDensity,
      attribute: ['position', 'texCoord'],
      stride: [3, 2],
      uniform: [
        'densityTexture',
      ],
      type: [
        'uniform1i',
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    const gl = this.gl;

    // カーソルの移動、ボタンを押した、ボタンを離した、の各種イベントを監視
    window.addEventListener('pointermove', (pointerEvent) => {
      if (this.isPress !== true) {
        this.isMove = false;
        return;
      }
      const vx = pointerEvent.clientX - this.previousMouse[0];
      const vy = pointerEvent.clientY - this.previousMouse[1];
      const length = Math.sqrt(vx * vx + vy * vy);
      this.previousMouse[0] = pointerEvent.clientX;
      this.previousMouse[1] = pointerEvent.clientY;
      this.uMouse[0] = pointerEvent.clientX / window.innerWidth * 2.0 - 1.0;
      this.uMouse[1] = -(pointerEvent.clientY / window.innerHeight * 2.0 - 1.0);
      if (length === 0.0) {
        this.uMouseDirection[0] = 0.0;
        this.uMouseDirection[1] = 0.0;
      } else {
        this.uMouseDirection[0] = vx / length;
        this.uMouseDirection[1] = -vy / length;
      }
      this.mouseLength = 1.0 + length;
      this.isMove = true;
    }, false);
    window.addEventListener('pointerdown', (pointerEvent) => {
      this.isPress = true;
      this.previousMouse[0] = pointerEvent.clientX;
      this.previousMouse[1] = pointerEvent.clientY;
    }, false);
    window.addEventListener('pointerup', () => {
      this.isPress = false;
      this.isMove = false;
    }, false);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // 各種セットアップ
    this.setupGeometry();
    this.setupSize();
    this.setupFramebuffer();
    this.running = true;
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 板（プレーン）の頂点情報
    this.planePosition = [
      -1.0,  1.0,  0.0,
       1.0,  1.0,  0.0,
      -1.0, -1.0,  0.0,
       1.0, -1.0,  0.0,
    ];
    this.planeTexCoord = [
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
    ];
    this.planeIndex = [
      0, 2, 1,
      1, 2, 3,
    ];
    this.planeVbo = [
      WebGLUtility.createVbo(this.gl, this.planePosition),
      WebGLUtility.createVbo(this.gl, this.planeTexCoord),
    ];
    this.planeIbo = WebGLUtility.createIbo(this.gl, this.planeIndex);
  }
  /**
   * 各種サイズの設定を行う。
   */
  setupSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.bufferWidth = Math.ceil(this.canvas.width / PIXEL_RATIO / window.devicePixelRatio);
    this.bufferHeight = Math.ceil(this.canvas.height / PIXEL_RATIO / window.devicePixelRatio);
  }
  /**
   * フレームバッファのセットアップを行う。
   */
  setupFramebuffer() {
    const gl = this.gl;

    // フレームバッファはスワップ可能なように２つセットで生成する
    this.bufferIndex = 0;
    this.velocityFramebuffers = [
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
    ];
    this.densityFramebuffers = [
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
    ];
    this.projectFramebuffers = [
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
      WebGLUtility.createFramebufferFloat2(gl, this.bufferWidth, this.bufferHeight),
    ];

    gl.viewport(0, 0, this.bufferWidth, this.bufferHeight);

    // リセット用シェーダを使って一度フレームバッファに値を焼き込む
    this.resetVelocityShaderProgram.use();
    this.resetVelocityShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.velocityFramebuffers.forEach((buffer) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    });
    this.resetDensityShaderProgram.use();
    this.resetDensityShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.densityFramebuffers.forEach((buffer) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    });
    this.resetProjectShaderProgram.use();
    this.resetProjectShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.projectFramebuffers.forEach((buffer) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    });
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // velocity と density を更新する
    gl.viewport(0, 0, this.bufferWidth, this.bufferHeight);
    this.updateVelocity();
    this.updateDensity();

    // 最終シーンを描画する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.isDrawDensity === true) {
      this.renderToDensity();
    } else {
      this.renderToVelocity();
    }
  }
  /**
   * velocity の更新を行う。
   */
  updateVelocity() {
    const gl = this.gl;

    // マウスカーソルが押下＋移動の場合、速度を加算する
    if (this.isPress === true && this.isMove === true) {
      this.forceVelocityShaderProgram.use();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[0].framebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
      this.forceVelocityShaderProgram.setUniform([
        [this.bufferWidth, this.bufferHeight],
        0,
        this.uTimeStep,
        this.uForceRadius,
        this.uForceIntensity * this.mouseLength,
        this.uMouseDirection,
        this.uMouse,
      ]);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
      this.swapVelocity();

      this.isMove = false;
    }
    // 拡散が設定されている場合計算する
    if (this.uDiffuse > 0.0) {
      this.diffuseVelocityShaderProgram.use();
      for (let i = 0; i < DIFFUSE_ITERATION; ++i) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[0].framebuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
        this.diffuseVelocityShaderProgram.setUniform([
          [this.bufferWidth, this.bufferHeight],
          0,
          this.uTimeStep,
          this.uDiffuse,
        ]);
        gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
        this.swapVelocity();
      }
    }
    // 質量の計算と移流を計算する
    this.updateProject();
    this.advectVelocityShaderProgram.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[0].framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
    this.advectVelocityShaderProgram.setUniform([
      [this.bufferWidth, this.bufferHeight],
      0,
      this.uTimeStep,
      this.uForceAttenuation,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    this.swapVelocity();
    this.updateProject();
  }
  /**
   * density の更新を行う。
   */
  updateDensity() {
    const gl = this.gl;

    // 拡散が設定されている場合計算する
    if (this.uDiffuse > 0.0) {
      this.diffuseDensityShaderProgram.use();
      for (let i = 0; i < DIFFUSE_ITERATION; ++i) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFramebuffers[0].framebuffer);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.densityFramebuffers[1].texture);
        this.diffuseDensityShaderProgram.setUniform([
          [this.bufferWidth, this.bufferHeight],
          0,
          this.uTimeStep,
          this.uDiffuse,
        ]);
        gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
        this.swapDensity();
      }
    }
    // 速度に応じて濃度を更新する
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFramebuffers[0].framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.densityFramebuffers[1].texture);
    this.advectDensityShaderProgram.use();
    this.advectDensityShaderProgram.setUniform([
      [this.bufferWidth, this.bufferHeight],
      0,
      1,
      this.uTimeStep,
      this.uAdditionalVelocity,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    this.swapDensity();
  }
  /**
   * project の更新を行う。
   */
  updateProject() {
    const gl = this.gl;

    this.projectBeginShaderProgram.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.projectFramebuffers[0].framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
    this.projectBeginShaderProgram.setUniform([
      [this.bufferWidth, this.bufferHeight],
      0,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    this.swapProject();

    this.projectLoopShaderProgram.use();
    for (let i = 0; i < PROJECT_ITERATION; ++i) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.projectFramebuffers[0].framebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.projectFramebuffers[1].texture);
      this.projectLoopShaderProgram.setUniform([
        [this.bufferWidth, this.bufferHeight],
        0,
      ]);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
      this.swapProject();
    }

    this.projectEndShaderProgram.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[0].framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.projectFramebuffers[1].texture);
    this.projectEndShaderProgram.setUniform([
      [this.bufferWidth, this.bufferHeight],
      0,
      1,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    this.swapVelocity();
  }
  /**
   * density をレンダリングする。
   */
  renderToDensity() {
    const gl = this.gl;
    this.renderDensityShaderProgram.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityFramebuffers[1].texture);
    this.renderDensityShaderProgram.setUniform([
      0,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
  }
  /**
   * velocity をレンダリングする。（ベクトルは正規化して可視化される）
   */
  renderToVelocity() {
    const gl = this.gl;
    this.renderVelocityShaderProgram.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);
    this.renderVelocityShaderProgram.setUniform([
      0,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
  }
  /**
   * veclocity 用のバッファをスワップする。
   */
  swapVelocity() {
    const temporary = this.velocityFramebuffers[0];
    this.velocityFramebuffers[0] = this.velocityFramebuffers[1];
    this.velocityFramebuffers[1] = temporary;
  }
  /**
   * density 用のバッファをスワップする。
   */
  swapDensity() {
    const temporary = this.densityFramebuffers[0];
    this.densityFramebuffers[0] = this.densityFramebuffers[1];
    this.densityFramebuffers[1] = temporary;
  }
  /**
   * project 用のバッファをスワップする。
   */
  swapProject() {
    const temporary = this.projectFramebuffers[0];
    this.projectFramebuffers[0] = this.projectFramebuffers[1];
    this.projectFramebuffers[1] = temporary;
  }
  /**
   * WebGL を実行するための初期化処理を行う。
   * @param {HTMLCanvasElement|string} canvas - canvas への参照か canvas の id 属性名のいずれか
   * @param {object} [option={}] - WebGL コンテキストの初期化オプション
   */
  init(canvas, option = {}) {
    if (canvas instanceof HTMLCanvasElement === true) {
      this.canvas = canvas;
    } else if (Object.prototype.toString.call(canvas) === '[object String]') {
      const c = document.querySelector(`#${canvas}`);
      if (c instanceof HTMLCanvasElement === true) {
        this.canvas = c;
      }
    }
    if (this.canvas == null) {
      throw new Error('invalid argument');
    }
    this.gl = this.canvas.getContext('webgl2', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }

    // WebGL 2.0 かつ、EXT_color_buffer_float が有効である必要がある
    if (this.gl.getExtension('EXT_color_buffer_float') == null) {
      throw new Error('"EXT_color_buffer_float" not supported');
    }
  }
}
