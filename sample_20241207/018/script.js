
/** ===========================================================================
 * レイマーチングの基本的なテクニックの１つに、除算の剰余（modulo）を活用した、
 * repetition があります。
 * 直訳すると、繰り返しという意味になる言葉ですが、文字通りレイマーチングで描か
 * れるオブジェクトを複製し繰り返し描画されるようにすることができます。このよう
 * な考え方は基本的に二次元でも三次元でも同じです。
 * 人間の目には「オブジェクトが複製された」ように見えるのですが、実際には「座標
 * が一定の範囲を繰り返すことによって結果的にオブジェクトが複製される」というこ
 * とが起こっています。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
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
    this.previousTime = 0; // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0; // 時間の進み方に対するスケール
    this.uTime = 0.0; // uniform 変数 time 用
    this.uParam = [0.0, 0.0, 0.0, 0.0]; // 汎用パラメータ（vec4 として扱う）

    // tweakpane を初期化
    const pane = new Pane();
    pane.addBlade({
      view: 'slider',
      label: 'global-timescale',
      min: 0.0,
      max: 2.0,
      value: this.timeScale,
    })
    .on('change', (v) => {
      this.timeScale = v.value;
    });
    // パラメータ名が表示されるようにしておく
    const parameters = [
      'focus',
      'radius',
      'light-z',
      'space-size', // 複製する空間の広さ
    ];
    this.uParam.forEach((param, index) => {
      pane.addBlade({
        view: 'slider',
        label: parameters[index],
        min: -1.0,
        max: 1.0,
        value: param,
      })
      .on('change', (v) => {
        this.uParam[index] = v.value;
      });
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
      ],
      stride: [
        3,
      ],
      uniform: [
        'resolution',
        'time',
        'param',
      ],
      type: [
        'uniform2fv',
        'uniform1f',
        'uniform4fv',
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    const gl = this.gl;

    this.setupGeometry();
    this.resize();
    this.running = true;
    this.previousTime = Date.now();

    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    this.position = [
      -1.0,  1.0,  0.0,
       1.0,  1.0,  0.0,
      -1.0, -1.0,  0.0,
       1.0, -1.0,  0.0,
    ];
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.position),
    ];
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    if (this.running === true) {
      requestAnimationFrame(this.render);
    }

    // 直前のフレームからの経過時間を取得
    const now = Date.now();
    const time = (now - this.previousTime) / 1000;
    this.uTime += time * this.timeScale;
    this.previousTime = now;

    // ビューポートのクリア処理
    gl.clear(gl.COLOR_BUFFER_BIT);

    // uniform 変数を設定し描画する
    this.shaderProgram.setUniform([
      [this.canvas.width, this.canvas.height],
      this.uTime,
      this.uParam,
    ]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.position.length / 3);
  }
  /**
   * リサイズ処理を行う。
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
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
