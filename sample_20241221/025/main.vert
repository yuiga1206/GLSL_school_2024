// 最終シーンをレンダリングするための頂点シェーダ

attribute vec3 position; // transform feedback で更新された頂点座標
attribute vec3 velocity; // transform feedback で更新された頂点の進行方向

uniform mat4  mvpMatrix;
uniform float pointScale;

varying vec4 vColor;

void main() {
  // 色は進行方向に由来して変化するようにする
  vColor = vec4((velocity + 1.0) * 0.5, 1.0);

  // 頂点座標は transform feedback で更新されているのでここでは単に行列と乗算
  gl_Position = mvpMatrix * vec4(position, 1.0);

  // ポイントサイズ
  gl_PointSize = 1.0 + pointScale;
}
