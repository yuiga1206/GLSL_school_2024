
/** ===========================================================================
 * 頂点の１つ１つに対して紐づく「その頂点固有の値」が attribute であるのに対し、
 * 「すべての頂点に一様に作用する汎用的な値」は uniform 変数として扱います。
 * attribute 変数とは異なり、バッファを作ってバインドするといった手順は必要あり
 * ません。ただし、ロケーションの取得など必要となる手続きの一部には似ている部分
 * もあり、このあたりは面倒ですがしっかりと準備してやる必要があります。
 * ※サンプルでは ShaderProgram クラスが内部でロケーション取得などを行っています
 * uniform 変数は一種のグローバルな定数のようなもので、すべての頂点、すべてのフ
 * ラグメントが同じ値を受け取ります。attribute 変数との違いに注意しながら、その
 * 動作を確認しましょう。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
// GLSL スクールでは cocopon 氏が製作・公開している GUI ツールを使っています
// https://cocopon.github.io/tweakpane/
import { Pane } from '../lib/tweakpane-4.0.0.min.js';

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

    // uniform 変数用に頂点のサイズを保持するプロパティを定義 @@@
    this.uPointSize = 1.0;

    // tweakpane を初期化 @@@
    const pane = new Pane();
    pane.addBlade({
      view: 'slider',
      label: 'point-size',
      min: 0.0,
      max: 2.0,
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
    const vs = await WebGLUtility.loadFile('./main.vert');
    const fs = await WebGLUtility.loadFile('./main.frag');
    this.shaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attribute: [
        'position',
        'color',
        'size',
      ],
      stride: [
        3,
        4,
        1,
      ],
      // uniform 変数（汎用変数）の定義を追加 @@@
      // ※シェーダ側の uniform 変数と名前やデータ型を揃える
      uniform: [
        'pointScale',
      ],
      type: [
        'uniform1f',
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
    this.running = true; // 繰り返し描画を行うためにフラグを真にする @@@
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
    // 頂点カラーの定義
    this.color = [
      1.0, 1.0, 1.0, 1.0,
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      0.5, 0.5, 0.5, 1.0,
    ];
    // 点描時のサイズの定義
    this.pointSize = [
      128.0,
       64.0,
       32.0,
       16.0,
        8.0,
    ];
    // 頂点の生データを VBO に変換し配列に入れておく
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

    // プログラムオブジェクトを指定し、VBO と uniform 変数を設定
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
    this.shaderProgram.setUniform([
      // 頂点の大きさに掛けるスケール @@@
      // ※今回は GLSL 側の定義が float なので、単体の数値を指定するのみでよい
      // ※GLSL 側の定義が vec3 などの場合は、配列で `[1, 1, 1]` のように指定すればよい
      this.uPointSize,
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
