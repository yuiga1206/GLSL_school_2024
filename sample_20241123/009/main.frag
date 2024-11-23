precision mediump float;

uniform sampler2D textureUnit; // テクスチャユニット @@@
varying vec2 vTexCoord; // テクスチャ座標 @@@

void main() {
  // テクスチャから色をサンプリング（抽出）する @@@
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  // ここではテクスチャ由来の色をそのまま出力するだけ
  gl_FragColor = samplerColor;
}
