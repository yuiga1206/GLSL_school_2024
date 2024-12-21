precision mediump float;
uniform sampler2D textureUnit; // フレームバッファ由来のテクスチャ
uniform float brightness; // 明るさ係数
uniform float distortionArea; // 歪み範囲係数
uniform float distortionScale; // 歪み量係数
uniform vec2 mouse; // 正規化済みマウス座標
varying vec2 vTexCoord;

void main() {
  // テクスチャ座標の原点を中央に変換してから処理する
  vec2 texCoord = vTexCoord * 2.0 - 1.0;

  // 原点中央のテクスチャ座標の、原点からの距離に応じて歪む量を変化させる
  float tLength = smoothstep(1.0 - distortionArea, 2.0 - distortionArea, length(texCoord));
  // 赤と青だけ水平方向に値をずらす @@@
  vec2 rCoord = texCoord + vec2(tLength * distortionScale, 0.0);
  vec2 gCoord = texCoord;
  vec2 bCoord = texCoord - vec2(tLength * distortionScale, 0.0);

  // 変化量はマウスカーソルとの距離で決まり、境界を目立たせないように工夫する
  float dist = smoothstep(0.0, 1.0, length(texCoord - mouse));
  // RGB ごとに、個別に変化量を適用しテクスチャ座標の原点をもとに戻す @@@
  rCoord = (rCoord * dist) * 0.5 + 0.5;
  gCoord = (gCoord * dist) * 0.5 + 0.5;
  bCoord = (bCoord * dist) * 0.5 + 0.5;

  // RGB ごとに、それぞれ色を取得して合成する
  vec4 rColor = texture2D(textureUnit, rCoord);
  vec4 gColor = texture2D(textureUnit, gCoord);
  vec4 bColor = texture2D(textureUnit, bCoord);
  vec3 rgb = vec3(rColor.r, gColor.g, bColor.b);

  // 明るさ係数を乗算してから出力する
  gl_FragColor = vec4(rgb * brightness, 1.0);
}
