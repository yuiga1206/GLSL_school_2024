
/** ===========================================================================
 * 3D シーンを描画する実装の雛形です。
 * WebGL と GLSL の組み合わせは、当然ながら 3D の空間を扱うことができます。
 * だからこそ 3DCG を画面にレンダリングすることができるわけですが、一方で、頂点
 * を三次元的に動かすのは WebGL や GLSL というよりも純粋に「数学」です。
 * コンピューターが魔法の力で三次元的な絵を作ってくれるわけではなく、ただただ純
 * 粋に数学で三次元的に頂点を動かします。数学によって変換された頂点を、WebGL が
 * そのまま描画してくれるだけなのです。
 * ですから、三次元的な描画結果を得たい場合は、頂点を変換するために非常に便利な
 * 概念である行列を用いてシェーダを記述する必要があります。
 * また描画したい世界が 3D になったことで、深度テストなどの新しい概念も登場しま
 * す。１つ１つ、手続きとその意味を確認していきましょう。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { WebGLMath } from '../lib/math.js'; // 算術用クラスを追加 @@@
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

    // 各種パラメータや uniform 変数用 @@@
    this.previousTime = 0; // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0;  // 時間の進み方に対するスケール
    this.uTime = 0.0;      // uniform 変数 time 用

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
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    const vs = await WebGLUtility.loadFile('./main.vert');
    const fs = await WebGLUtility.loadFile('./main.frag');
    this.shaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attribute: [
        'position',
        'color',
      ],
      stride: [
        3,
        4,
      ],
      uniform: [
        'time',
        'mvpMatrix', // MVP 行列 @@@
      ],
      type: [
        'uniform1f',
        'uniformMatrix4fv', // 行列は type に Matrix という文字列が含まれる
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    this.setupGeometry();
    this.resize();
    this.running = true;
    this.previousTime = Date.now(); // 開始時のタイムスタンプを入れておく @@@

    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clearDepth(1.0); // クリアする際の深度値 @@@
    this.gl.enable(this.gl.DEPTH_TEST); // 深度テストを有効にする @@@
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    this.position = [];
    this.color = [];
    // 頂点を格子状に並べ、座標に応じた色を付ける
    const COUNT = 100;
    for (let i = 0; i < COUNT; ++i) {
      const x = i / (COUNT - 1);
      const signedX = x * 2.0 - 1.0;
      for (let j = 0; j < COUNT; ++j) {
        const y = j / (COUNT - 1);
        const signedY = y * 2.0 - 1.0;
        this.position.push(signedX, signedY, 0.0);
        this.color.push(x, y, 0.5, 1.0);
      }
    }
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.position),
      WebGLUtility.createVbo(this.gl, this.color),
    ];
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    // 短く書けるようにローカル変数に一度代入する
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // 直前のフレームからの経過時間を取得 @@@
    const now = Date.now();
    const time = (now - this.previousTime) / 1000;
    // 時間のスケールを考慮して、経過時間を加算 @@@
    this.uTime += time * this.timeScale;
    // 次のフレームで使えるように現在のタイムスタンプを保持しておく @@@
    this.previousTime = now;

    // ビューポートの設定と背景色・深度値のクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // - 各種行列を生成する ---------------------------------------------------
    // モデル座標変換行列（ここではゆっくりと X 軸回転）
    const rotateAxis  = v3.create(1.0, 0.0, 0.0); // X 軸回転を掛ける
    const rotateAngle = this.uTime * 0.1;         // 回転角は時間由来
    const m = m4.rotate(m4.identity(), rotateAngle, rotateAxis);

    // ビュー座標変換行列（ここではカメラは固定）
    const eye         = v3.create(0.0, 0.0, 3.0); // カメラの位置
    const center      = v3.create(0.0, 0.0, 0.0); // カメラの注視点
    const upDirection = v3.create(0.0, 1.0, 0.0); // カメラの天面の向き
    const v = m4.lookAt(eye, center, upDirection);

    // プロジェクション座標変換行列
    const fovy   = 60;                                     // 視野角（度数）
    const aspect = this.canvas.width / this.canvas.height; // アスペクト比
    const near   = 0.1;                                    // ニア・クリップ面までの距離
    const far    = 10.0;                                   // ファー・クリップ面までの距離
    const p = m4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（行列を掛ける順序に注意、ここでは列優先）
    const vp = m4.multiply(p, v);
    const mvp = m4.multiply(vp, m);
    // ------------------------------------------------------------------------

    // プログラムオブジェクトを指定し、VBO と uniform 変数を設定
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
    this.shaderProgram.setUniform([
      this.uTime, // 経過時間
      mvp, // MVP 行列
    ]);

    // 設定済みの情報を使って、頂点を画面にレンダリングする
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
    this.gl = this.canvas.getContext('webgl', option);
    if (this.gl == null) {
      throw new Error('webgl not supported');
    }
  }
}

