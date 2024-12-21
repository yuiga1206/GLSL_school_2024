precision mediump float;

varying vec4 vColor;

void main() {
  // 頂点を光源的に描画するための計算
  vec2 p = gl_PointCoord.st * 2.0 - 1.0;
  float f = pow(0.1 / length(p), 1.5);
  gl_FragColor = vColor * vec4(f);
}
