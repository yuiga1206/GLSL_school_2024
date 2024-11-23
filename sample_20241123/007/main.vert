
attribute vec3 planePosition;  // 平面の座標
attribute vec4 planeColor;     // 平面の色
attribute vec3 spherePosition; // 球体の座標
attribute vec4 sphereColor;    // 球体の色

uniform float ratio; // 変化の割合い（0.0 ～ 1.0） @@@
uniform float time;
uniform mat4 mvpMatrix;

varying vec4 vColor;

void main() {
  // 変化の割合いをもとに線形補間する @@@
  vec3 p = mix(planePosition, spherePosition, ratio);
  vec4 c = mix(planeColor, sphereColor, ratio);

  // 色はそのままフラグメントシェーダへ
  vColor = c;

  // 座標は Y 座標を指標にサイン波で揺らす @@@
  float s = sin(p.y + time);
  p += vec3(0.0, s * 0.1, 0.0);
  gl_Position = mvpMatrix * vec4(p, 1.0);

  gl_PointSize = 4.0;
}
