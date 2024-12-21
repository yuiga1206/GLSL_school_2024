precision mediump float;
uniform sampler2D textureUnit; // フレームバッファ由来のテクスチャ
uniform float brightness; // 明るさ係数
varying vec2 vTexCoord;

void main() {
  // シーンを焼いた結果をまずはテクスチャから取り出す
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  // 取り出した色に明るさ係数を乗算してから出力する
  gl_FragColor = samplerColor * vec4(vec3(brightness), 1.0);
}
