precision mediump float;
uniform sampler2D textureUnit; // フレームバッファ由来のテクスチャ
uniform float brightness; // 明るさ係数
uniform float saturation; // 彩度係数
uniform vec2 mouse; // 正規化済みマウス座標
varying vec2 vTexCoord; // ★★ 0~1 の範囲

void main() {
  // テクスチャ座標の原点を中央に変換してから処理する
  // ★★ 0~1 ->　-1~1 に変換
  vec2 texCoord = vTexCoord * 2.0 - 1.0;
  // 変化量はマウスカーソルとの距離で決まり、境界を目立たせないように工夫する
  float dist = smoothstep(0.0, 1.0, length(texCoord - mouse));
  // 変化量を適用し、テクスチャ座標の原点をもとに（左下）戻す
  // ★★ 0に近づくように変換される
  texCoord = (texCoord * dist) * 0.5 + 0.5;


  // シーンを焼いた結果をテクスチャから取り出す
  // ★★ ここでサンプリングされて出てくる絵は、すでに歪んだ状態で出てくる。
  vec4 samplerColor = texture2D(textureUnit, texCoord);


  // グレイスケール化した色をつくる（内積を用いた簡易的なグレイスケール化）
  // ★★ (R + G + B) / 3
  float gray = dot(samplerColor.rgb, vec3(1.0)) / 3.0;

  // 彩度係数に応じて色を補間
  // ★★ mix(A, B, 0.0 ~ 1.0) 線形補間した結果を返す
  vec3 rgb = mix(vec3(gray), samplerColor.rgb, saturation);

  // 取り出した色に明るさ係数を乗算してから出力する
  gl_FragColor = vec4(rgb * brightness, 1.0);
}
