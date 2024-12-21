
/** ===========================================================================
 * WebGL などの CG の分野において、フレームバッファと呼ばれる概念は特に重要なも
 * のです。
 * フレームバッファとは「グラフィックスのレンダリング領域」のことで、これまでの
 * すべてのサンプルでは、特に手順を踏まなくてもデフォルトで生成される「既定のフ
 * レームバッファ」が暗黙で利用されていました。
 * このフレームバッファは既定で作成されるもの以外にも、独自に生成してそれを利用
 * することができます。これはすなわち、グラフィックスをレンダリングする対象領域
 * をあとから任意に追加することができる、ということに他なりません。
 *
 * では、任意に描画領域を追加できるとなにが嬉しいのでしょうか？
 *
 * 描画対象領域を追加し、そこにレンダリングを行った結果は、別のシェーダにテクス
 * チャとして渡すことができます。これにより、１：シーンを描く、２：描いたシーン
 * をテクスチャとしてバインドする、３：別のシェーダでそのテクスチャを読み込みさ
 * らに加工する、という処理を行うことができます。
 * つまり、一度レンダリングを行った後に、その場で、即座に、エフェクトを追加する
 * などのよりリッチな表現が行えるようになるのです。
 * ここでは、フレームバッファの生成から利用するための手順までをまとめています。
 * 覚えることがすごく多いのですが……ひとつひとつ押さえていきましょう。
 * ========================================================================= */

import { WebGLUtility, ShaderProgram } from '../lib/webgl.js';
import { WebGLMath } from '../lib/math.js';
import { WebGLOrbitCamera } from '../lib/camera.js';
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
    this.previousTime = 0;  // 直前のフレームのタイムスタンプ
    this.timeScale = 1.0;   // 時間の進み方に対するスケール
    this.uTime = 0.0;       // uniform 変数 time 用
    this.uBrightness = 1.0; // uniform 変数 brightness 用 @@@

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
      label: 'brightness',
      min: 0.0,
      max: 1.0,
      value: this.uBrightness,
    })
    .on('change', (v) => {
      this.uBrightness = v.value;
    });
  }
  /**
   * シェーダやテクスチャ用の画像など非同期で読み込みする処理を行う。
   * @return {Promise}
   */
  async load() {
    // メインシーン用のシェーダ @@@
    const mainVs = await WebGLUtility.loadFile('./main.vert');
    const mainFs = await WebGLUtility.loadFile('./main.frag');
    this.mainShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: mainVs,
      fragmentShaderSource: mainFs,
      attribute: [
        'position',
        'normal',
        'texCoord',
      ],
      stride: [
        3,
        3,
        2,
      ],
      uniform: [
        'mvpMatrix',
        'normalMatrix',
        'textureUnit',
      ],
      type: [
        'uniformMatrix4fv',
        'uniformMatrix4fv',
        'uniform1i',
      ],
    });
    // ポストプロセス用のシェーダ @@@
    const postVs = await WebGLUtility.loadFile('./post.vert');
    const postFs = await WebGLUtility.loadFile('./post.frag');
    this.postShaderProgram = new ShaderProgram(this.gl, {
      vertexShaderSource: postVs,
      fragmentShaderSource: postFs,
      attribute: [
        'position',
      ],
      stride: [
        3,
      ],
      uniform: [
        'textureUnit',
        'brightness', // 明度 @@@
      ],
      type: [
        'uniform1i',
        'uniform1f',
      ],
    });

    // = 補足 =================================================================
    // メインのシーンとポストプロセスのシーンは、必ずしも異なるシェーダで処理し
    // なければならないというわけではありません。
    // ただしその場合、頂点属性（座標や法線）の構成が一緒である必要がありますし
    // 当たり前ですが同じ質感で描画されることになるため、表現を分離させることが
    // できなくなります。
    // ここで２つのシェーダをわざわざ初期化しているのは、メインシーンとポストプ
    // ロセスのシーンとを、それぞれ異なるシェーダで処理することで表現に柔軟性を
    // 持たせるためです。
    // ========================================================================

    // 画像を読み込み、テクスチャを生成する
    const source = './sample.jpg';
    this.texture = await WebGLUtility.createTextureFromFile(this.gl, source);
  }
  /**
   * WebGL のレンダリングを開始する前のセットアップを行う。
   */
  setup() {
    const gl = this.gl;

    const cameraOption = {
      distance: 3.0,
      min: 1.0,
      max: 10.0,
      move: 2.0,
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    this.setupGeometry();
    this.resize();
    this.running = true;
    this.previousTime = Date.now();

    // フレームバッファを生成する @@@
    this.buffers = WebGLUtility.createFramebuffer(this.gl, this.canvas.width, this.canvas.height);

    gl.clearColor(0.9, 0.6, 0.9, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
  }
  /**
   * ジオメトリ（頂点情報）を構築するセットアップを行う。
   */
  setupGeometry() {
    // 球体（スフィア）の頂点情報 @@@
    this.spherePosition = [];
    this.sphereNormal = [];
    this.sphereTexCoord = [];
    this.sphereIndex = [];
    const split = 64;
    const radian = 1.0;
    for (let i = 0; i <= split; i++) {
      const r = Math.PI / split * i;
      const ry = Math.cos(r);
      const rr = Math.sin(r);
      for (let j = 0; j <= split; j++) {
        const tr = Math.PI * 2 / split * j;
        const tx = rr * radian * Math.cos(tr);
        const ty = ry * radian;
        const tz = rr * radian * Math.sin(tr);
        const rx = rr * Math.cos(tr);
        const rz = rr * Math.sin(tr);
        this.spherePosition.push(tx, ty, tz);
        this.sphereNormal.push(rx, ry, rz);
        this.sphereTexCoord.push(1 - 1 / split * j, 1 / split * i);
      }
    }
    for (let i = 0; i < split; i++) {
      for (let j = 0; j < split; j++) {
        const k = (split + 1) * i + j;
        this.sphereIndex.push(k, k + 1, k + split + 2);
        this.sphereIndex.push(k, k + split + 2, k + split + 1);
      }
    }
    this.sphereVbo = [
      WebGLUtility.createVbo(this.gl, this.spherePosition),
      WebGLUtility.createVbo(this.gl, this.sphereNormal),
      WebGLUtility.createVbo(this.gl, this.sphereTexCoord),
    ];
    this.sphereIbo = WebGLUtility.createIbo(this.gl, this.sphereIndex);

    // 板（プレーン）の頂点情報 @@@
    this.planePosition = [
      -1.0,  1.0,  0.0,
       1.0,  1.0,  0.0,
      -1.0, -1.0,  0.0,
       1.0, -1.0,  0.0,
    ];
    this.planeIndex = [
      0, 2, 1,
      1, 2, 3,
    ];
    this.planeVbo = [
      WebGLUtility.createVbo(this.gl, this.planePosition),
    ];
    this.planeIbo = WebGLUtility.createIbo(this.gl, this.planeIndex);

    // = 補足 =================================================================
    // このサンプルではインデックスバッファ（IBO）を使っています。
    // インデックスバッファは、描画を行う際に利用する頂点の情報を「頂点の定義順
    // に由来するインデックス（０始まり）」で指定するために使われます。
    // 板（プレーン）のほうのインデックス（this.planeIndex）を定義しているところ
    // を見てみると、意味がわかりやすいのではないでしょうか。
    // 同じ頂点の定義を複数回使い回すことができ、多くの場合より効率的にデータを
    // 記述することができます。
    // インデックスバッファを用いる場合、描画命令はこれまでの gl.drawArrays では
    // なく gl.drawElements になります。この２つの描画命令は、引数の構成なども異
    // なりますので気をつけましょう。
    // ========================================================================
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

    // メインシーンとポストプロセスを実行 @@@
    this.renderMain();
    this.renderPostProcess();
  }
  /**
   * メインシーンの描画
   */
  renderMain() {
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;
    // ★★ テクスチャが貼られた、球体が置かれているシーンを、フレームバッファに焼き付けたい

    // フレームバッファのバインド @@@
    // ※これ以降、描画はフレームバッファに対して行われる
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffers.framebuffer);

    // 描画に利用するテクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // ビューポートの設定とクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // - 各種行列を生成する ---------------------------------------------------
    // モデル座標変換行列
    const rotateAxis  = v3.create(0.0, 1.0, 0.0);
    const rotateAngle = this.uTime * 0.2;
    const m = m4.rotate(m4.identity(), rotateAngle, rotateAxis);

    // ビュー座標変換行列（WebGLOrbitCamera から行列を取得する）
    const v = this.camera.update();

    // プロジェクション座標変換行列
    const fovy   = 60;
    const aspect = this.canvas.width / this.canvas.height;
    const near   = 0.1
    const far    = 20.0;
    const p = m4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（行列を掛ける順序に注意）
    const vp = m4.multiply(p, v);
    const mvp = m4.multiply(vp, m);
    const n = m4.inverse(m4.transpose(m));
    // ------------------------------------------------------------------------

    // メインシーン用のプログラムオブジェクトを指定し、VBO、IBO、uniform 変数を設定
    this.mainShaderProgram.use();
    this.mainShaderProgram.setAttribute(this.sphereVbo, this.sphereIbo);
    this.mainShaderProgram.setUniform([
      mvp,
      n,
      0,
    ]);
    // インデックスバッファを使って描画
    gl.drawElements(gl.TRIANGLES, this.sphereIndex.length, gl.UNSIGNED_SHORT, 0);

    // = 補足 =================================================================
    // メインシーンでは、頂点に法線と呼ばれる「面の向き」に相当する情報を与えて
    // やり、それをシェーダ内で参照しながら陰影付け（照明効果）を行っています。
    // 頂点が回転したり移動したりしても破綻しないよう、法線を変換するための行列
    // を別途シェーダに送るなど、照明効果を及ぼすためには必要な手順がいくつかあ
    // りますが、ここでは最低限の説明しか行っていません。
    // もし詳しく知りたい場合はご質問いただければ解説しますので遠慮なくどうぞ！
    // ========================================================================
  }
  /**
   * ポストプロセスでの描画
   */
  renderPostProcess() {
    const gl = this.gl;

    // ★★ 画面に描画結果が出て欲しいので、フレームバッファのバインドを解除

    // フレームバッファのバインドを解除
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 描画に利用するテクスチャのバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.buffers.texture);

    // ビューポートの設定とクリア
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ポストプロセス用のプログラムオブジェクトを指定し、VBO、IBO、uniform 変数を設定
    this.postShaderProgram.use();
    this.postShaderProgram.setAttribute(this.planeVbo, this.planeIbo);
    this.postShaderProgram.setUniform([
      0,
      this.uBrightness, // 明度 @@@
    ]);
    // インデックスバッファを使って描画
    gl.drawElements(gl.TRIANGLES, this.planeIndex.length, gl.UNSIGNED_SHORT, 0);
  }
  /**
   * リサイズ処理を行う。
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // フレームバッファのサイズもウィンドウの大きさに同期させる @@@
    if (this.buffers != null) {
      const gl = this.gl;
      const width = this.canvas.width;
      const height = this.canvas.height;
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.buffers.renderbuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      gl.bindTexture(gl.TEXTURE_2D, this.buffers.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    // = 補足 =================================================================
    // フレームバッファを構成する要素のうち、幅や高さのパラメータを持っているの
    // は、深度バッファ用のレンダーバッファとテクスチャです。
    // フレームバッファそのものは、各種バッファの入れ物であり幅や高さといった具
    // 体的な大きさに関するプロパティは持っていません。
    // ========================================================================
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
