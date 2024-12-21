// 最終シーンをレンダリングするためのフラグメントシェーダ
precision mediump float;

uniform float globalAlpha; // 全体に掛かるアルファ値

varying vec4 vColor; // 頂点シェーダで進行方向に由来して着色した色

void main() {
  // ポイントスプライト化する
  vec2 p = gl_PointCoord.st * 2.0 - 1.0;
  float f = 0.2 / length(p) * (1.0 - min(length(p), 1.0));

  // これはオマケです（コメントアウトを外すと……）
  // f = 0.05 / abs(p.x * p.y) * (1.0 - min(length(p), 1.0));

  // 全体に掛かるアルファの影響を考慮
  gl_FragColor = vColor * vec4(vec3(f), globalAlpha);
}
