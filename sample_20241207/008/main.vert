
attribute vec3 planePosition;
attribute vec4 planeColor;
attribute vec3 spherePosition;
attribute vec4 sphereColor;
attribute float offset; // ランダムなオフセット値（0.0 ～ 1.0未満） @@@

uniform float ratio; // 変化の割合い（0.0 ～ 1.0）
uniform float time;
uniform mat4 mvpMatrix;

varying vec4 vColor;

void main() {
  // オフセット量を考慮して補間の係数を算出 @@@
  // -1.0 ～ 1.0 の範囲を取る position.x を 0.0 ～ 1.0 に変換する
  float unsignedPosition = planePosition.x * 0.5 + 0.5;
  // offset と position.x 由来の値とを合算し、0.5 倍して 0.0 ～ 1.0 に変換
  // ★★ offset：0.0 ~ 1.0、unsignedPosition：0.0 ~ 1.0
  // ★★ 二つを足すと最大で2になるので、0.5 をかけて、最大で 1 になるようにする
  float o = (offset + unsignedPosition) * 0.5;
   // ★★ o は 0 ~ 1

  float merged = o + ratio * 2.0 - 1.0;
  // ★★ -1 ~ 2 <- 0.0 ~ 1.0 を超えてる

  // uniform 変数 ratio の影響を加算した上で、0.0 ～ 1.0 にクランプする
   // ★★ clamp ：指定された範囲外の値は丸める
   // -1 とかは 0 に丸められるので、動き出すまでに時間がかかる。
   // よってランダム的な動きに見える。
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
