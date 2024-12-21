precision mediump float;

uniform sampler2D textureUnit;
varying vec3 vNormal;
varying vec2 vTexCoord;

// ライトベクトルを定義
const vec3 DIRECTIONAL_LIGHT = normalize(vec3(1.0, 1.0, 1.0));

void main() {
  // 内積を用いて平行光源の影響を計算する（陰性付けをする）
  float diffuse = dot(normalize(vNormal), DIRECTIONAL_LIGHT) * 0.5 + 0.5;
  // テクスチャの色
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  // 光源の影響とテクスチャの色を乗算のうえ出力
  gl_FragColor = vec4(samplerColor.rgb * diffuse, samplerColor.a);
}
