
/** ===========================================================================
 * サンプルの雛形実装です。
 * 極力、余計なことはせずにシンプルな形にしてあります。まずは、このサンプルをひ
 * とつの基準として、どのあたりに要点があるのかを把握しておきましょう。
 * ※このサンプルをベースに、今後少しずつ必要に応じて拡張していきます
 *
 * import している webgl.js には、WebGL の API を手間を省いて使いやすくするため
 * の機能が実装してあります。GLSL スクールでは、WebGL の API そのものの詳細につ
 * いては必要最低限のみ説明するようにし、極力シェーダのほうに集中できるようにサ
 * ンプルを実装しています。
 * webgl.js 内では現時点で以下の２つのクラスが定義してあります。
 * ----------------------------------------------------------------------------
 * WebGLUtility: WebGL の API を用いてオブジェクト生成などを補助する
 * ShaderProgram: シェーダに関する情報をまとめて保持し有効化などの機能を提供する
 * ----------------------------------------------------------------------------
 * この２つのクラス、WebGLUtility のほうは文字通りユーティリティとして使うことを
 * 想定した「手間を減らせる便利関数の集合体」です。クラス内に実装されたすべての
 * メソッドが static に実装されています。（つまりクラスを new しないで使う）
 * ShaderProgram クラスのほうは、クラスを new してインスタンスを生成します。こち
 * らはシェーダとそれに関連した情報を１つにまとめて保持しておくためのものです。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';

/**
 * JavaScript では、イベントを検出するために addEventListener というメソッドを利
 * 用します。このメソッドは、window の他、HTMLElement などの多くのオブジェクトが
 * はじめから備えており、第一引数に指定したイベントが検出されると、第二引数に指
 * 定したコールバック関数が呼び出されます。（WebGL とは無関係な JS の機能です）
 *
 * example: window.addEventListener(イベント名, コールバック関数, オプション);
 *
 * 以下の例では `DOMContentLoaded` イベントが検出されると、第二引数に指定した無
 * 名関数が呼び出されます。
 * `DOMContentLoaded` イベントは、ブラウザが HTML を読み込んでパース完了したタイ
 * ミングを検出することができます。これを行う意味は、HTML が読み込み完了していな
 * いタイミングで JavaScript が実行されてしまうと、操作対象となる canvas がその
 * 時点では存在していないなど、意図しないエラーが発生してしまうためです。
 */
window.addEventListener('DOMContentLoaded', async () => {
  // WebGLApp クラスを new キーワードでインスタンス化
  const app = new WebGLApp();
  // リサイズ時の処理を設定
  window.addEventListener('resize', app.resize, false);
  // WebGLApp.init メソッドには、HTML に書かれた canvas の id 属性名を指定
  app.init('webgl-canvas');
  /**
   * load メソッドは Promise を返します。
   * Promise は、JavaScript で非同期処理を行うための仕組みのひとつです。
   * 非同期処理とは「ファイルを開く」や「サーバからのレスポンスを待つ」といった
   * ような「どのタイミングでそれが完了するかわからない処理」のことです。
   * シェーダのファイルを読み込む処理は非同期で処理されるので、その完了を待って
   * 続きの処理を行うために、ここでは Promise が使われています。
   * async/await 構文を使うことで、非同期処理を同期処理のように実行順どおりに記
   * 述することができます。
   */
  await app.load(); // await を使って Promise の処理を記述
  app.setup();
  app.render();
}, false);

/**
 * サンプルを１つのアプリケーションと捉え、その機能をまとめてクラスとして実装
 */
class WebGLApp {
  /**
   * @constructor
   */
  constructor() {
    // 汎用的な（だいたいいつも使う）プロパティ
    this.canvas = null; // canvas エレメント
    this.gl = null; // WebGL コンテキスト
    this.running = false; // 実行中かどうかを表すフラグ

    // this を固定するためメソッドをバインドする
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }
  /**
   * WebGL を実行するための初期化処理を行う。
   * @param {HTMLCanvasElement|string} canvas - canvas への参照か canvas の id 属性名のいずれか
   * @param {object} [option={}] - WebGL コンテキストの初期化オプション
   */
  init(canvas, option = {}) {
    if (canvas instanceof HTMLCanvasElement === true) {
      // 引数 canvas が HTMLCanvasElement だった場合はそのままプロパティに代入
      this.canvas = canvas;
    } else if (Object.prototype.toString.call(canvas) === '[object String]') {
      // 引数 canvas が文字列であった場合は HTML から該当する id を持つ要素を取得
      const c = document.querySelector(`#${canvas}`);
      if (c instanceof HTMLCanvasElement === true) {
        this.canvas = c;
      }
    }
    // この時点で canvas が正しく取得できていなければエラー
    if (this.canvas == null) {
      throw new Error('invalid argument');
    }
    // canvas から WebGL コンテキスト取得を試みる
    this.gl = this.canvas.getContext('webgl', option);
    if (this.gl == null) {
      // WebGL コンテキストが取得できない場合はエラー
      throw new Error('webgl not supported');
    }
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    // シェーダのソースコードをテキストとして読み込む
    const vs = await WebGLUtility.loadFile('./main.vert');
    const fs = await WebGLUtility.loadFile('./main.frag');

    // シェーダの情報をひとまとめにしたオブジェクトを生成する
    // ※ShaderProgram は webgl.js に実装されている独自のクラスであることに注意
    this.shaderProgram = new ShaderProgram(this.gl, {
      // シェーダのソースコード
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      // 頂点属性名と、そのストライドを指定する
      // ※シェーダ側の attribute 変数と揃える
      attribute: [
        'position',
      ],
      stride: [
        3,
      ],
    });
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    // 頂点（ジオメトリ）のセットアップ
    this.setupGeometry();
    // 一度リサイズ処理を行っておく
    this.resize();
    // 背景を何色でクリアするかを 0.0 ～ 1.0 の RGBA で指定する
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    // このサンプルでは一度描画するのみなので running は false のままにしておく
    this.running = false;
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 頂点座標の定義（これがシェーダ内で参照する attribute 変数の元になる最初のデータ定義）
    this.position = [
       0.0,  0.0,  0.0, // １つ目の頂点の XYZ
      -0.5,  0.5,  0.0, // ２つ目の頂点の XYZ
       0.5,  0.5,  0.0, // ３つ目の頂点の XYZ
      -0.5, -0.5,  0.0, // ４つ目の頂点の XYZ
       0.5, -0.5,  0.0, // ５つ目の頂点の XYZ
    ];
    // 定義した頂点の情報（頂点属性）は VBO に変換しておく
    // ※ WebGLApp.setAttribute で処理するために配列に入れています
    this.vbo = [
      WebGLUtility.createVbo(this.gl, this.position),
    ];
  }
  /**
   * リサイズ処理を行う。
   */
  resize() {
    // ウィンドウサイズぴったりに canvas のサイズを修正する
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  /**
   * WebGL を利用して描画を行う。
   */
  render() {
    const gl = this.gl;

    // running が true の場合は requestAnimationFrame を呼び出す
    if (this.running === true) {
      /**
       * requestAnimationFrame 関数は、JavaScript でアニメーション処理を行うため
       * に用いられます。呼び出し時の引数には、なにかしらの関数を与えておきます。
       * requestAnimationFrame はディスプレイのリフレッシュレートに合わせて、引
       * 数に指定された関数をウェブブラウザが自動的に、かつ適切なタイミングで呼
       * び出してくれます。
       */
      requestAnimationFrame(this.render);
    }

    // WebGL 上のビューポートも canvas の大きさに揃える
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // あらかじめ指定されていたクリアカラーでクリアする
    gl.clear(gl.COLOR_BUFFER_BIT);
    // どのプログラムオブジェクトを使うのかを明示する
    this.shaderProgram.use();
    // attribute 変数に VBO を設定する
    this.shaderProgram.setAttribute(this.vbo);

    // 設定済みの情報を使って、頂点を画面にレンダリングする
    gl.drawArrays(gl.POINTS, 0, this.position.length / 3);
  }
}
