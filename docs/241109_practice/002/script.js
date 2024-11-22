
/** ===========================================================================
 * 頂点には、座標の他にも自由に属性（attribute）を追加することができます。
 * ただし注意すべきポイントがいくつかあります。
 * １つは GLSL と JavaScript の両者の変更内容をしっかりと揃えること。
 * 具体的には GLSL に記述された attribute 変数の内容と JavaScript で記述する VBO
 * の構成に相違があるとうまくいきません。特にデータ型と配列内の要素の数を一致さ
 * せるよう気をつけましょう。
 * ２つ目に、頂点に新たな属性を追加した場合、ロケーションやストライドの設定もそ
 * れに合わせて変更する必要があること。
 * ３つ目に、すべての頂点属性は「同じ数の頂点分だけ定義」すること。座標が頂点５
 * 個分あるのに、色は３個分しかない、といった状況ではエラーになります。
 * 細かいルールが多いですが、落ち着いて設定しましょう。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';

window.addEventListener('DOMContentLoaded', async () => {
  // WebGLApp クラスの初期化とリサイズ処理の設定
  const app = new WebGLApp();
  window.addEventListener('resize', app.resize, false);
  // アプリケーションのロードと初期化
  app.init('webgl-canvas');
  await app.load();
  // セットアップして描画を開始
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
        'color', // 頂点カラー @@@
        'size', // 点描時のサイズ @@@
      ],
      stride: [
        3,
        4, // vec4 @@@
        1, // float @@@
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    this.setupGeometry();
    this.resize();
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.running = false;
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 頂点座標の定義
    this.position = [
       0.0,  0.0,  0.0,
      -0.5,  0.5,  0.0,
       0.5,  0.5,  0.0,
      -0.5, -0.5,  0.0,
       0.5, -0.5,  0.0,
    ];
    // 頂点カラーの定義 @@@
    this.color = [
      1.0, 1.0, 1.0, 1.0,
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      0.5, 0.5, 0.5, 1.0,
    ];
    // 点描時のサイズの定義 @@@
    this.pointSize = [
      128.0,
       64.0,
       32.0,
       16.0,
        8.0,
    ];
    // 頂点の生データを VBO に変換し配列に入れておく @@@
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.position),
      WebGLUtility.createVbo(this.gl, this.color),
      WebGLUtility.createVbo(this.gl, this.pointSize),
    ];
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // ビューポートの設定と背景のクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // プログラムオブジェクトを指定し、VBO を設定する
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);

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
