
/** ===========================================================================
 * 別のサンプルでは WebGL 2.0 で利用可能となった transform feedback を用いるこ
 * とで、動的に VBO をシェーダで書き換えるという荒業を行いました。
 * しかし、WebGL 1.0 環境を前提にした場合は GPGPU を行うことはできないのかな？
 * という疑問を持った方もいたかもしれません。
 * このサンプルでは、WebGL 1.0 環境で、浮動小数点テクスチャへと頂点の座標情報な
 * どを書き込むことで、GPGPU を実現しています。初期化処理、そして描画のフローも
 * かなり複雑になっていますが、その苦労に見合った美しい描画結果を得ることができ
 * ます。
 * ここでは、Curl Noise と呼ばれる「ノイズを使って進行方向を制御する方法」を実装
 * しています。難易度が高い実装なのでちょっと難しいかもしれませんが、せめて参考
 * 程度にでも見てみてもらえたらと思います。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { WebGLMath } from '../lib/math.js';
import { Pane } from '../lib/tweakpane-4.0.0.min.js';

const POINT_RESOLUTION = 128; // 描かれる頂点の個数（解像度）

window.addEventListener('DOMContentLoaded', async () => {
  const app = new WebGLApp();
  window.addEventListener('resize', app.resize, false);
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

    // this を固定するためメソッドをバインドする
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    // 各種パラメータや uniform 変数用
    this.previousTime = 0;    // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0;     // 時間の進み方に対するスケール
    this.uTime = 0.0;         // uniform 変数 time 用
    this.uPress = false;      // uniform 変数 press 用
    this.uMouse = [0.0, 0.0]; // uniform 変数 mouse 用
    this.uMoveSpeed = 0.02;   // uniform 変数 moveSpeed 用
    this.uPointSize = 32.0;   // uniform 変数 pointSize 用

    // tweakpane を初期化
    const pane = new Pane();
    pane.addBlade({
      view: 'slider',
      label: 'move-speed',
      min: 0.0,
      max: 0.1,
      value: this.uMoveSpeed,
    })
    .on('change', (v) => {
      this.uMoveSpeed = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'point-size',
      min: 1.0,
      max: 64.0,
      value: this.uPointSize,
    })
    .on('change', (v) => {
      this.uPointSize = v.value;
    });
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    // 最終シーン用のシェーダ
    const mainVs = await WebGLUtility.loadFile('./main.vert');
    const mainFs = await WebGLUtility.loadFile('./main.frag');
    this.mainShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: mainVs,
      fragmentShaderSource: mainFs,
      attribute: [
        'texCoord',
      ],
      stride: [
        2,
      ],
      uniform: [
        'mvpMatrix',
        'pointSize',
        'positionTexture',
        'velocityTexture',
      ],
      type: [
        'uniformMatrix4fv',
        'uniform1f',
        'uniform1i',
        'uniform1i',
      ],
    });
    // リセット用のシェーダ
    const resetVs = await WebGLUtility.loadFile('./reset.vert');
    const resetFs = await WebGLUtility.loadFile('./reset.frag');
    this.resetShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: resetVs,
      fragmentShaderSource: resetFs,
      attribute: [
        'position',
      ],
      stride: [
        3,
      ],
      uniform: [
        'resolution',
      ],
      type: [
        'uniform2fv',
      ],
    });
    // 座標更新用のシェーダ
    const positionVs = await WebGLUtility.loadFile('./position.vert');
    const positionFs = await WebGLUtility.loadFile('./position.frag');
    this.positionShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: positionVs,
      fragmentShaderSource: positionFs,
      attribute: [
        'position',
      ],
      stride: [
        3,
      ],
      uniform: [
        'prevTexture',
        'velocityTexture',
        'resolution',
        'press',
        'speed',
      ],
      type: [
        'uniform1i',
        'uniform1i',
        'uniform2fv',
        'uniform1i',
        'uniform1f',
      ],
    });
    // 進行方向更新用のシェーダ
    const velocityVs = await WebGLUtility.loadFile('./velocity.vert');
    const velocityFs = await WebGLUtility.loadFile('./velocity.frag');
    this.velocityShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: velocityVs,
      fragmentShaderSource: velocityFs,
      attribute: [
        'position',
      ],
      stride: [
        3,
      ],
      uniform: [
        'prevTexture',
        'positionTexture',
        'resolution',
        'press',
        'mouse',
      ],
      type: [
        'uniform1i',
        'uniform1i',
        'uniform2fv',
        'uniform1i',
        'uniform2fv',
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
      const x = pointerEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = pointerEvent.clientY / window.innerHeight * 2.0 - 1.0;
      this.uMouse[0] = x;
      this.uMouse[1] = -y;
    }, false);
    window.addEventListener('pointerdown', () => {
      // ボタンが押されたとき、動く強さを最大にし、フラグを立てる @@@
      this.moveIntensity = 1.0;
      this.uPress = true;
    }, false);
    window.addEventListener('pointerup', () => {
      // ボタンが離されたときは、フラグを下ろすだけ @@@
      this.uPress = false;
    }, false);

    this.setupGeometry();
    this.resize();
    this.running = true;
    this.previousTime = Date.now();

    /**
     * 今回の実装では、直近の頂点座標や、直近の頂点の進行方向を知る必要があるた
     * め、座標用と進行方向用とで、それぞれ２つのフレームバッファを準備しておき
     * ます。
     * また、フレームバッファには浮動小数点テクスチャをアタッチすることになるた
     * め、createFramebufferFloat を使ってフレームバッファを生成します。
     */
    // フレームバッファを生成する
    this.bufferIndex = 0;
    this.extensions = WebGLUtility.getWebGLExtensions(this.gl);
    this.positionFramebuffers = [
      WebGLUtility.createFramebufferFloat(this.gl, this.extensions, POINT_RESOLUTION, POINT_RESOLUTION),
      WebGLUtility.createFramebufferFloat(this.gl, this.extensions, POINT_RESOLUTION, POINT_RESOLUTION),
    ];
    this.velocityFramebuffers = [
      WebGLUtility.createFramebufferFloat(this.gl, this.extensions, POINT_RESOLUTION, POINT_RESOLUTION),
      WebGLUtility.createFramebufferFloat(this.gl, this.extensions, POINT_RESOLUTION, POINT_RESOLUTION),
    ];
    // texture のバインド処理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.positionFramebuffers[0].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.positionFramebuffers[1].texture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[0].texture);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.velocityFramebuffers[1].texture);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // まず一度、リセットシェーダで描画しておく
    this.renderReset();
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // テクスチャ座標
    this.texCoord = [];
    for (let i = 0; i < POINT_RESOLUTION; ++i) {
      const t = i / POINT_RESOLUTION;
      for (let j = 0; j < POINT_RESOLUTION; ++j) {
        const s = j / POINT_RESOLUTION;
        this.texCoord.push(s, t);
      }
    }
    this.pointVbo = [
      WebGLUtility.createVbo(this.gl, this.texCoord),
    ];

    // 板（プレーン）の頂点情報
    this.planePosition = [
      -1.0,  1.0,  0.0,
       1.0,  1.0,  0.0,
      -1.0, -1.0,  0.0,
       1.0, -1.0,  0.0,
    ];
    this.planeTexCoord = [
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0,
    ];
    this.planeIndex = [
      0, 2, 1,
      1, 2, 3,
    ];
    this.planeVbo = [
      WebGLUtility.createVbo(this.gl, this.planePosition),
    ];
    this.planeIbo = WebGLUtility.createIbo(this.gl, this.planeIndex);
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // 経過時間の処理
    const now = Date.now();
    const time = (now - this.previousTime) / 1000;
    this.uTime += time * this.timeScale;
    this.previousTime = now;

    // 頂点座標の更新と、最終シーンの描画
    this.renderAttribute();
    this.renderMain();
  }
  /**
   * リセットシェーダで描画する。
   */
  renderReset() {
    const gl = this.gl;

    this.resetShaderProgram.use();
    this.resetShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.resetShaderProgram.setUniform([
      [POINT_RESOLUTION, POINT_RESOLUTION],
    ]);
    gl.viewport(0, 0, POINT_RESOLUTION, POINT_RESOLUTION);
    for (let i = 0; i <= 1; ++i) {
      // position buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.positionFramebuffers[i].framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
      // velocity buffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[i].framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
    }
  }
  /**
   * 頂点座標、進行方向の更新用シェーダで描画する。
   */
  renderAttribute() {
    const gl = this.gl;

    // ブレンドを切り、ビューポートを設定する
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, POINT_RESOLUTION, POINT_RESOLUTION);

    const currentIndex = this.bufferIndex;
    const otherIndex = 1 - this.bufferIndex;
    this.bufferIndex = otherIndex;

    // まずは進行方向から更新する
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocityFramebuffers[currentIndex].framebuffer);
    this.velocityShaderProgram.use();
    this.velocityShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.velocityShaderProgram.setUniform([
      2 + otherIndex,
      0 + otherIndex,
      [POINT_RESOLUTION, POINT_RESOLUTION],
      this.uPress,
      this.uMouse,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);

    // 続いて座標を更新する
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.positionFramebuffers[currentIndex].framebuffer);
    this.positionShaderProgram.use();
    this.positionShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.positionShaderProgram.setUniform([
      0 + otherIndex,
      2 + currentIndex,
      [POINT_RESOLUTION, POINT_RESOLUTION],
      this.uPress,
      this.uMoveSpeed,
    ]);
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
  }
  /**
   * メインシーンを描画する。
   */
  renderMain() {
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    // ブレンドの設定
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);

    // フレームバッファのバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // ビューポートの設定とクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // - 各種行列を生成する ---------------------------------------------------
    // ビュー座標変換行列（ここではカメラは固定）
    const eye         = v3.create(0.0, 0.0, 4.0); // カメラの位置
    const center      = v3.create(0.0, 0.0, 0.0); // カメラの注視点
    const upDirection = v3.create(0.0, 1.0, 0.0); // カメラの天面の向き
    const v = m4.lookAt(eye, center, upDirection);

    // プロジェクション座標変換行列
    const fovy   = 60;
    const aspect = this.canvas.width / this.canvas.height;
    const near   = 0.01;
    const far    = 50.0;
    const p = m4.perspective(fovy, aspect, near, far);

    // 行列を乗算（今回はモデル座標変換をしないので、MVP の代わりに VP を使う）
    const vp = m4.multiply(p, v);
    // ------------------------------------------------------------------------

    // メインシーン用のプログラムオブジェクトを指定し、VBO、uniform 変数を設定
    this.mainShaderProgram.use();
    this.mainShaderProgram.setAttribute(this.pointVbo);
    this.mainShaderProgram.setUniform([
      vp,
      this.uPointSize,
      0 + (1 - this.bufferIndex), // 直近で更新された座標
      2 + (1 - this.bufferIndex), // 直近で更新された進行方向（色付けに使う）
    ]);
    gl.drawArrays(gl.POINTS, 0, POINT_RESOLUTION * POINT_RESOLUTION);
  }
  /**
   * リサイズ処理を行う。
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
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
    this.gl = this.canvas.getContext('webgl', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }
  }
}
