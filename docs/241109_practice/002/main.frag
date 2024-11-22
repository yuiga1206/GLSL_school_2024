precision mediump float;

varying vec4 vColor; // 頂点シェーダから送られてきた値 @@@

void main() {
  // 頂点の色を、特に変換したりせずにそのまま出力する
  gl_FragColor = vColor;
}
