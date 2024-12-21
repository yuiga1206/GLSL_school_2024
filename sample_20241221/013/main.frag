precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

void main() {
  // 正規化（この時点では 0.0 ～ 1.0）
  vec2 coord = gl_FragCoord.xy / resolution;

  // 正負の方向に -1.0 ～ 1.0 で値が分布するように変換 @@@
  vec2 signedCoord = coord * 2.0 - 1.0;

  float lightness = 0.0;

  // ０．初期状態（canvas 全体を明るくする）
  // lightness = 1.0;

  // １．実直に、正規化後の Y 方向の値が -0.01 ～ 0.01 の範囲だけ色をつけてみる
  // if (-0.01 < signedCoord.y && signedCoord.y < 0.01) {
  //   lightness = 1.0;
  // }

  // ２．条件分岐は使わずにやってみる
  // ★★ sign は引数に応じて 0.0, 1.0,-1.0 を返す
  // ★★ sign =>  0      -> 0,
  // ★★          0 < x  -> 1,
  // ★★          0 > x  -> -1
  // ★★ サイン・コサインのsinではなく、符号のsign。
  // lightness = sign(-abs(signedCoord.y) + 0.01);

  // ３．ちょっとネオンっぽくグラデーションさせる
  // ★★ x / 0 = inf （無限）
  // ★★ x / 0.1 = x が10倍
  // ★★ abs(signedCoord.y) が 0 に近いほど大きくなる
  // lightness = 0.01 / abs(signedCoord.y);

  // ４．正規化後の X 座標も使うことで傾ける
  // lightness = 0.01 / abs(signedCoord.y + signedCoord.x);

  // ５．正規化後の X 座標からサインを計算して波打たせる
  // lightness = 0.01 / abs(signedCoord.y + sin(signedCoord.x));
  // lightness = 0.01 / abs(signedCoord.y + sin(signedCoord.x * 2.0));

  // ６．時間の経過を使ってみたり、波の高さを変えてみたり、思い思いにやってみる
  lightness = 0.01 / abs(signedCoord.y + sin(signedCoord.x + time) * param.y);

  vec3 rgb = vec3(coord, abs(sin(time)) * param.x);
  gl_FragColor = vec4(rgb * lightness, 1.0);
}
