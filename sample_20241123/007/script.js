
/** ===========================================================================
 * 頂点属性、つまり attribute 変数をどのような構成にするかによって、頂点に対して
 * 座標の他にも色や法線といった様々な情報を持たせることができます。
 * どのような情報を持たせるかを実装者が自由に構成できるメリットを活かして、ここ
 * では１つの頂点の中に２つの状態を詰め込んでみます。
 * １つ目の状態は、平面に規則正しく並んだ状態。２つ目の状態は、球体の形に並んだ
 * 状態とし、色も少し変えてみます。
 * 頂点シェーダ内でこれらの attribute 変数の情報を補間して出力します。１つ目の状
 * 態と２つ目の状態のどちらに寄せるかは、変化の割合いをパラメータ化し uniform 変
 * 数としてシェーダに送り、これを指標として利用します。
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
    this.previousTime = 0; // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0;  // 時間の進み方に対するスケール
    this.uTime = 0.0;      // uniform 変数 time 用
    this.uRatio = 0.0;     // 変化の割合い @@@

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
    // 変化の割合いは 0.0 ～ 1.0 で変化させる @@@
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
        // 頂点属性（attribute）は２セット用意する @@@
        'planePosition',  // 平面配置の頂点座標
        'planeColor',     // 平面配置の頂点カラー
        'spherePosition', // 球体配置の頂点座標
        'sphereColor',    // 球体配置の頂点カラー
      ],
      stride: [
        3,
        4,
        3,
        4,
      ],
      uniform: [
        'ratio', // 変化の割合い @@@
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
    // 平面状の頂点属性の定義 @@@
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
          // this.planeColor.push(1.0, 0.0, 0.0, 1.0); // 赤
        }
      }
    }
    // 球体状の頂点属性の定義 @@@
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
          // this.sphereColor.push(0.0, 0.0, 1.0, 1.0); // 青
        }
      }
    }
    // すべての頂点属性を VBO にしておく @@@
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.planePosition),
      WebGLUtility.createVbo(this.gl, this.planeColor),
      WebGLUtility.createVbo(this.gl, this.spherePosition),
      WebGLUtility.createVbo(this.gl, this.sphereColor),
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

    // 行列を乗算して MVP 行列を生成する（行列を掛ける順序に注意）
    const vp = m4.multiply(p, v);
    const mvp = m4.multiply(vp, m);
    // ------------------------------------------------------------------------

    // プログラムオブジェクトを指定し、VBO と uniform 変数を設定
    this.shaderProgram.use();
    this.shaderProgram.setAttribute(this.vbo);
    this.shaderProgram.setUniform([
      this.uRatio, // 変化の割合い @@@
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
