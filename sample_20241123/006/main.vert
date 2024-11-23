
attribute vec3 position;
attribute vec4 color;

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
  gl_Position = mvpMatrix * vec4(p, 1.0);
}

