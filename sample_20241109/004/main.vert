
attribute vec3 position;
attribute vec4 color;
attribute float size;

uniform float pointScale;
uniform vec2 mouse; // マウスカーソルの座標（-1.0 ~ 1.0） @@@

varying vec4 vColor;

void main() {
  vColor = color;
  gl_Position = vec4(position, 1.0);

  // 頂点座標からマウスの位置を指すベクトル @@@
  // ★★ 頂点座標もマウスの位置も -1.0 ~ 1.0 の間にある
  // ★★ 終点 - 始点 でベクトルを表せる
  vec2 toMouse = mouse - position.xy;
  // ベクトルの長さを測る @@@
  // ★★ length() == ベクトルの長さを測る関数
  // ★★ 近ければ小さい（短い）、遠ければ大きい（長い）
  float distanceToMouse = length(toMouse);
  // ベクトルの長さを考慮して頂点のサイズを変化させる @@@
  gl_PointSize = size * pointScale * distanceToMouse;
}
