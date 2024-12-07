
/** ===========================================================================
 * WebGL + GLSL を用いた表現・創作にはさまざまな事例やカルチャーがあります。
 * そのなかでも人気のあるものに、広義にシェーダアートと呼ばれているジャンルがあ
 * ります。シェーダアートに一定の、なにか厳密な定義があるわけではありませんが、
 * なんとなくやんわりと統一された手法やフォーマットがあります。
 * ここでは glslsandbox や twigl などで使われている形に近い構成で、よりシンプル
 * にシェーダアート用の雛形を実装してあります。一般に、シェーダアートの世界では
 * フラグメントシェーダだけを用いてスクリーン空間で絵作りを行います。
 * このフラグメントシェーダだけで絵を作る感覚が、最初はすごくつかみにくい部分で
 * もありますので１つ１つ落ち着いて考えるのがよいでしょう。
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
    this.timeScale = 1.0;  // 時間の進み方に対するスケール
    this.uTime = 0.0;      // uniform 変数 time 用
    this.uParam = 0.5;     // 汎用パラメータ

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
      label: 'param',
      min: 0.0,
      max: 1.0,
      value: this.uParam,
    })
    .on('change', (v) => {
      this.uParam = v.value;
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
        'resolution', // canvas の解像度
        'time', // 時間の経過
        'param', // 汎用パラメータ
      ],
      type: [
        'uniform2fv',
        'uniform1f',
        'uniform1f',
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

    // シェーダプログラムを設定し、頂点情報をバインドする
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
      [this.canvas.width, this.canvas.height], // canvas の解像度
      this.uTime, // 時間の経過
      this.uParam, // 汎用パラメータ
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
