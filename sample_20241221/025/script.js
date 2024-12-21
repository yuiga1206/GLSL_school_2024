
/** ===========================================================================
 * これまで扱ってきたすべてのサンプルは、WebGL 1.0 と呼ばれる最初のバージョンを
 * ベースにした実装でした。
 * 現在では、WebGL 2.0 が正式に勧告されている状況で、基本的にメジャーブラウザで
 * は 2.0 でも問題なく動作するようになってきています。
 * ここでは、WebGL 2.0 を利用した技術のひとつとして transform feedback を扱って
 * みましょう。とにかくやることが多いのと、複数のシェーダを細かく制御・連携させ
 * てやる必要があるため非常に難易度が高い実装ですが、いわゆる GPGPU を実現するこ
 * とができる面白いテクニックのひとつです。
 * 簡単に概要を説明すると、従来では CPU 側で定義したものをただ使うしか方法が無か
 * った VBO を、GPU 側、つまりシェーダ内で高速に更新することができるというもので
 * す。
 * VBO の中身をシェーダで動的に書き換えることにより、頂点座標の更新を高速に行う
 * ことができ、今回のサンプルのようなパーティクルの制御などが行なえます。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { WebGLMath } from '../lib/math.js';
import { Pane } from '../lib/tweakpane-4.0.0.min.js';

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
    this.previousTime = 0;     // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0;      // 時間の進み方に対するスケール
    this.uTime = 0.0;          // uniform 変数 time 用
    this.uPress = false;       // uniform 変数 press 用
    this.uMouse = [0.0, 0.0];  // uniform 変数 mouse 用
    this.uTurnIntensity = 0.1; // uniform 変数 turnIntensity 用
    this.uGlobalAlpha = 0.75;  // uniform 変数 globalAlpha 用
    this.moveIntensity = 0.0;  // 動く強さ
    this.moveSpeed = 0.1;      // 動く速度
    this.pointScale = 16.0;    // 点の大きさのスケール

    // tweakpane を初期化
    const pane = new Pane();
    pane.addBlade({
      view: 'slider',
      label: 'time-scale',
      min: 0.0,
      max: 2.0,
      value: this.timeScale,
    })
    .on('change', (v) => {
      this.timeScale = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'turn-intensity',
      min: 0.01,
      max: 0.5,
      value: this.uTurnIntensity,
    })
    .on('change', (v) => {
      this.uTurnIntensity = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'move-speed',
      min: 0.01,
      max: 0.5,
      value: this.moveSpeed,
    })
    .on('change', (v) => {
      this.moveSpeed = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'point-scale',
      min: 1.0,
      max: 64.0,
      value: this.pointScale,
    })
    .on('change', (v) => {
      this.pointScale = v.value;
    });
    pane.addBlade({
      view: 'slider',
      label: 'global-alpha',
      min: 0.0,
      max: 1.0,
      value: this.uGlobalAlpha,
    })
    .on('change', (v) => {
      this.uGlobalAlpha = v.value;
    });
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    // メインシーン用のシェーダ
    const mainVs = await WebGLUtility.loadFile('./main.vert');
    const mainFs = await WebGLUtility.loadFile('./main.frag');
    this.mainShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: mainVs,
      fragmentShaderSource: mainFs,
      attribute: [
        'position',
        'velocity',
      ],
      stride: [
        3,
        3,
      ],
      uniform: [
        'mvpMatrix',
        'pointScale',
        'globalAlpha',
      ],
      type: [
        'uniformMatrix4fv',
        'uniform1f',
        'uniform1f',
      ],
    });
    // transform feedback 用のシェーダ @@@
    const transformFeedbackVs = await WebGLUtility.loadFile('./transform_feedback.vert');
    const transformFeedbackFs = await WebGLUtility.loadFile('./transform_feedback.frag');
    this.transformFeedbackShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: transformFeedbackVs,
      fragmentShaderSource: transformFeedbackFs,
      attribute: [
        'position',
        'velocity',
      ],
      stride: [
        3,
        3,
      ],
      uniform: [
        'press',
        'time',
        'mouse',
        'turnIntensity',
        'moveIntensity',
      ],
      type: [
        'uniform1i',
        'uniform1f',
        'uniform2fv',
        'uniform1f',
        'uniform1f',
      ],
      transformFeedbackVaryings: [
        // transform feedback で出力する対象となる変数名 @@@
        'vPosition',
        'vVelocity',
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

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // すべての頂点が無条件で描画されるようにブレンドの設定を行っておく（加算＋アルファ） @@@
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 頂点データは、解像度を指定して XY 平面に敷き詰める形 @@@
    const RESOLUTION = 128; // 配置する頂点の解像度
    const SCALE = 2.0;      // 配置する範囲のスケール
    this.position = [];
    this.velocity = [];
    for (let i = 0; i < RESOLUTION; ++i) {
      const x = i / RESOLUTION * 2.0 - 1.0;
      for (let j = 0; j < RESOLUTION; ++j) {
        const y = j / RESOLUTION * 2.0 - 1.0;
        this.position.push(x * SCALE, -y * SCALE, 0.0);
        const length = Math.sqrt(x * x + y * y);
        this.velocity.push(x / length, -y / length, 0.0);
      }
    }
    // VBO は２セット用意しておき、相互に値を読み出し・書き込みできるようにしておく @@@
    this.vboIndex = 0;
    this.vbo = [
      [
        WebGLUtility.createVbo(this.gl, this.position),
        WebGLUtility.createVbo(this.gl, this.velocity),
      ], [
        WebGLUtility.createVbo(this.gl, this.position),
        WebGLUtility.createVbo(this.gl, this.velocity),
      ],
    ];
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

    // transform feedback の更新処理
    this.updateTransformFeedback();

    // 最終シーンの描画
    this.renderMain();
  }
  /**
   * transform feedback の更新処理
   */
  updateTransformFeedback() {
    const gl = this.gl;

    // マウスボタンが押されていない場合は減衰させる @@@
    if (this.uPress !== true) {
      this.moveIntensity *= 0.95;
    }

    // transform feedback を有効にする手続き @@@
    const currentIndex = this.vboIndex;
    const otherIndex = 1 - this.vboIndex;
    this.vboIndex = otherIndex;
    this.transformFeedbackShaderProgram.use();
    this.transformFeedbackShaderProgram.setAttribute(this.vbo[currentIndex]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vbo[otherIndex][0]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.vbo[otherIndex][1]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);

    // uniform を更新して描画 @@@
    this.transformFeedbackShaderProgram.setUniform([
      this.uPress, // マウスボタンが押されているかどうか
      this.uTime, // 経過時間
      this.uMouse, // マウスカーソルの位置（正規化済み）
      this.uTurnIntensity, // 曲がろうとする力
      this.moveIntensity * this.moveSpeed, // 動く力に速度を乗算
    ]);
    gl.drawArrays(gl.POINTS, 0, this.position.length / 3);

    // transform feedback の無効化手続き @@@
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
  }
  /**
   * メインシーンの描画
   */
  renderMain() {
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    // ビューポートの設定とクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // - 各種行列を生成する ---------------------------------------------------
    // ビュー座標変換行列（ここではカメラは固定）
    const eye         = v3.create(0.0, 0.0, 5.0); // カメラの位置
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
    this.mainShaderProgram.setAttribute(this.vbo[this.vboIndex]);
    this.mainShaderProgram.setUniform([
      vp,
      this.moveIntensity * this.pointScale, // 動く力に点の大きさを乗算
      this.uGlobalAlpha,
    ]);
    gl.drawArrays(gl.POINTS, 0, this.position.length / 3);
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
    // transform feedback を利用するにはは WebGL 2.0 を使う必要がある @@@
    this.gl = this.canvas.getContext('webgl2', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }
  }
}
