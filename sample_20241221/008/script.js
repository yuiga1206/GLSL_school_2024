
/** ===========================================================================
 * ２つの状態を持つ頂点が一斉に動き出す様子も悪くはありませんが、これがランダム
 * に動き出すようになっていると、また違った雰囲気になります。
 * 頂点の１つ１つがバラバラに動き出すようにするためには、個々の頂点がそれぞれに
 * ランダムな頂点属性（attribute）を備えている状態にしてやればよいでしょう。
 * ここではさらにオマケとして、カメラを操作できる機能を追加してあります。
 * 具体的には、カメラに関する情報を処理する自作の制御クラスを用いてカメラの位置
 * や注視点をマウス等で操作できるようにしつつ、そこからビュー座標変換行列を取得
 * して MVP 行列を生成しています。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { WebGLMath } from '../lib/math.js';
import { WebGLOrbitCamera } from '../lib/camera.js'; // カメラ制御 @@@
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
    this.uRatio = 0.0;     // 変化の割合い

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
      label: 'ratio',
      min: 0.0,
      max: 1.0,
      value: this.uRatio,
    })
    .on('change', (v) => {
      this.uRatio = v.value;
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
        'planePosition',  // 平面の頂点座標
        'planeColor',     // 平面の頂点カラー
        'spherePosition', // 球体の頂点座標
        'sphereColor',    // 球体の頂点カラー
        'offset',         // ランダムなオフセット値 @@@
      ],
      stride: [
        3,
        4,
        3,
        4,
        1, // オフセットは GLSL 側では float なのでストライドは 1
      ],
      uniform: [
        'ratio',
        'time',
        'mvpMatrix',
      ],
      type: [
        'uniform1f',
        'uniform1f',
        'uniformMatrix4fv',
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    // カメラ関係の初期化 @@@
    const cameraOption = {
      distance: 3.0, // Z 軸上の初期位置までの距離
      min: 1.0,      // カメラが寄れる最小距離
      max: 10.0,     // カメラが離れられる最大距離
      move: 2.0,     // 右ボタンで平行移動する際の速度係数
    };
    // 第一引数に、ポインターイベントを処理する対象、第二引数にオプション
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    this.setupGeometry();
    this.resize();
    this.running = true;
    this.previousTime = Date.now();

    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clearDepth(1.0);
    this.gl.enable(this.gl.DEPTH_TEST);
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    const COUNT  = 100; // 頂点の個数
    const RADIUS = 1.0; // 球体の半径
    this.planePosition = [];  // 頂点座標
    this.planeColor = [];     // 頂点カラー
    this.spherePosition = []; // 頂点座標
    this.sphereColor = [];    // 頂点カラー
    this.offset = [];         // オフセット @@@
    // 平面状の頂点属性の定義
    {
      for (let i = 0; i < COUNT; ++i) {
        // X 座標を求める
        let x = i / COUNT;
        x = x * RADIUS * 2.0 - RADIUS;
        for (let j = 0; j < COUNT; ++j) {
          // Y 座標を求める
          let y = j / COUNT;
          y = y * RADIUS * 2.0 - RADIUS;
          // 求めた XY 座標を格納
          this.planePosition.push(-x, -y, 0.0);
          // 色は割合いから適当に決める（特に深い意味はありません）
          this.planeColor.push(i / COUNT, j / COUNT, 0.5, 1.0);
        }
      }
    }
    // 球体状の頂点属性の定義
    {
      for (let i = 0; i < COUNT; ++i) {
        // 変数 i を元にラジアンを求める（経度方向のラジアン）
        const iRad = (i / COUNT) * Math.PI * 2.0;
        // 求めたラジアンからサインとコサインを作る
        const x = Math.sin(iRad);
        const z = Math.cos(iRad);
        for (let j = 0; j < COUNT; ++j) {
          // 変数 j を元にラジアンを求める（緯度方向のラジアン）
          const jRad = j / COUNT * Math.PI;
          const r = Math.sin(jRad);
          const y = Math.cos(jRad);
          // 計算結果を元に XYZ 座標を決める
          this.spherePosition.push(
            x * RADIUS * r,
            y * RADIUS,
            z * RADIUS * r,
          );
          // 色は平面のときとは異なるものにする（特に深い意味はありません）
          this.sphereColor.push(1.0 - i / COUNT, 1.0 - j / COUNT, 0.5, 1.0);

          // オフセットを一緒に確定させておく（中身は単なるランダムな 0.0 ～ 1.0 の値） @@@
          this.offset.push(Math.random());
        }
      }
    }
    // すべての頂点属性を VBO にしておく
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.planePosition),
      WebGLUtility.createVbo(this.gl, this.planeColor),
      WebGLUtility.createVbo(this.gl, this.spherePosition),
      WebGLUtility.createVbo(this.gl, this.sphereColor),
      WebGLUtility.createVbo(this.gl, this.offset), // オフセット @@@
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

    // 直前のフレームからの経過時間を取得
    const now = Date.now();
    const time = (now - this.previousTime) / 1000;
    this.uTime += time * this.timeScale;
    this.previousTime = now;

    // ビューポートの設定と背景色・深度値のクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // - 各種行列を生成する ---------------------------------------------------
    // モデル座標変換行列（ここでは、モデル座標変換では特になにも動かさない）
    const m = m4.identity();

    // ビュー座標変換行列（WebGLOrbitCamera から行列を取得する） @@@
    const v = this.camera.update();

    // プロジェクション座標変換行列
    const fovy   = 60;                                     // 視野角（度数）
    const aspect = this.canvas.width / this.canvas.height; // アスペクト比
    const near   = 0.1;                                    // ニア・クリップ面までの距離
    const far    = 20.0;                                   // ファー・クリップ面までの距離
    const p = m4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（行列を掛ける順序に注意）
    const vp = m4.multiply(p, v);
    const mvp = m4.multiply(vp, m);
    // ------------------------------------------------------------------------

    // プログラムオブジェクトを指定し、VBO と uniform 変数を設定
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
    this.shaderProgram.setUniform([
      this.uRatio,
      this.uTime,
      mvp,
    ]);

    // 設定済みの情報を使って、頂点を画面にレンダリングする
    gl.drawArrays(gl.POINTS, 0, this.planePosition.length / 3);
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
