precision mediump float;

uniform vec2 resolution; // canvas の解像度
uniform float time; // 時間の経過
uniform float param; // 汎用パラメータ

// ★★ canvas の大きさを GLSL内で知ることはできない
// ★★ だからJSから canvas の大きさを resolution として送ってあげる

void main() {
  // gl_FragCoord.xy を解像度で割って正規化する（0.0 ～ 1.0）
  // ★★ gl_FragCoord はフラグメントシェーダが実行されるピクセル座標
  vec2 coord = gl_FragCoord.xy / resolution;
  // ★★ この時点で、coord の中身は、0 ~ 1 の範囲を取りうる


  // 正規化した座標を RG に、汎用パラメータ由来の値を B に出力する
  // ★★ 線形に増えていく時間という値を、サイン波に変換した後、マイナスになっちゃうのがいやだから abs する
  gl_FragColor = vec4(coord, abs(sin(time)) * param, 1.0);
  // ★★ abs = アブソリュートの略、絶対値を取る。符号を無視する。
  // ★★ 本来のsin波は -1 ~ 1 の範囲だが、
  // ★★ 全部プラスになり、0 ~ 1 の範囲になる。
  // ★★ マイナスがあると、点滅の待ち時間（マイナス分）が発生する。
}
