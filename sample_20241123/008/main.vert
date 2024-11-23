
attribute vec3 planePosition;
attribute vec4 planeColor;
attribute vec3 spherePosition;
attribute vec4 sphereColor;
attribute float offset; // ランダムなオフセット値（0.0 ～ 1.0） @@@

uniform float ratio; // 変化の割合い（0.0 ～ 1.0）
uniform float time;
uniform mat4 mvpMatrix;

varying vec4 vColor;

void main() {
  // オフセット量を考慮して補間の係数を算出 @@@
  // -1.0 ～ 1.0 の範囲を取る position.x を 0.0 ～ 1.0 に変換する
  float unsignedPosition = planePosition.x * 0.5 + 0.5;
  // offset と position.x 由来の値とを合算し、0.5 倍して 0.0 ～ 1.0 に変換
  float o = (offset + unsignedPosition) * 0.5;
  // uniform 変数 ratio の影響を加算した上で、0.0 ～ 1.0 にクランプする
  float merged = o + ratio * 2.0 - 1.0;
  float clamped = clamp(merged, 0.0, 1.0);

  // 変化の割合いをもとに線形補間する
  vec3 p = mix(planePosition, spherePosition, clamped);
  vec4 c = mix(planeColor, sphereColor, clamped);

  // 色はそのままフラグメントシェーダへ
  vColor = c;

  // 座標は Y 座標を指標にサイン波で揺らす
  float s = sin(p.y + time);
  p += vec3(0.0, s * 0.1, 0.0);
  gl_Position = mvpMatrix * vec4(p, 1.0);

  gl_PointSize = 4.0;
}
