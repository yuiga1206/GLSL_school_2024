

// ★★ attribute：それぞれの頂点が個別に持つユニークな情報
// ★★ つまり。頂点が１つずつ頂点シェーダによって処理されるたびに、position という名前の変数の中身は毎回変わる（それぞれの頂点が持っている値に置き換わる）可能性がある
attribute vec3 position;
attribute vec4 color;

// ★★ uniform：一種のグローバル変数のように使う
uniform float time; // 経過時間
uniform mat4 mvpMatrix; // MVP 行列 @@@

varying vec4 vColor;

void main() {
  vColor = color;
  gl_PointSize = 4.0;

  // 頂点の Z 座標をサイン波で揺らす
  float s = sin(position.x + time);
  vec3 p = position + vec3(0.0, 0.0, s);

  // MVP 行列を乗算してから出力する @@@
  // ※ここでも列優先であることに注意
  // ★★ いま描こうとしている全ての頂点が同じ行列によって変換される！
  gl_Position = mvpMatrix * vec4(p, 1.0);
  // gl_Position = vec4(p, 1.0); // ★★ 初期配置のまま
  // gl_Position = vec4(0.5, 0.5, 0.0, 0.0) + vec4(p, 1.0); // ★★ 少しズレた位置に表示
}

