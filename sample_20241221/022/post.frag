precision mediump float;
uniform sampler2D textureUnit; // フレームバッファ由来のテクスチャ
uniform float time; // 時間の経過
uniform float frequency; // 周波数
uniform vec2 mouse; // 正規化済みマウス座標
varying vec2 vTexCoord;

// 乱数生成（その１）
float rnd(vec2 p) {
  return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
}

// 乱数生成（その２）
float rnd2(vec2 n) {
  float a = 0.129898;
  float b = 0.78233;
  float c = 437.585453;
  float dt= dot(n ,vec2(a, b));
  float sn= mod(dt, 3.14);
  return fract(sin(sn) * c);
}

void main() {
  // 本来のレンダリング結果
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);

  // テクスチャ座標の原点を中央に変換したものを作っておく
  vec2 texCoord = vTexCoord * 2.0 - 1.0;

  // ヴィネット（カーソル位置に連動）
  float vig = clamp(1.0 - length(texCoord) + length(mouse), 0.0, 1.0);

  // ホワイトノイズ（0.5 ～ 1.0 の範囲になるように変換）
  float n = rnd(texCoord + time);
  n = n * 0.5 + 0.5;

  // グレイスケール
  float gray = dot(samplerColor.rgb, vec3(1.0));

  // サイン波（0.5 ～ 1.0 の範囲になるように変換）
  float wave = sin((texCoord.t + time * 0.1) * frequency);
  wave = wave * 0.25 + 0.75;

  // いろいろ合成して出力する
  gl_FragColor = vec4(vec3(0.0, gray, 0.0) * vig * n * wave, 1.0);
}
