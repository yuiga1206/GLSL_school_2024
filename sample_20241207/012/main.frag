precision mediump float;

uniform vec2 resolution; // canvas の解像度
uniform float time; // 時間の経過
uniform float param; // 汎用パラメータ

void main() {
  // gl_FragCoord.xy を解像度で割って正規化する（0.0 ～ 1.0）
  vec2 coord = gl_FragCoord.xy / resolution;
  // 正規化した座標を RG に、汎用パラメータ由来の値を B に出力する
  gl_FragColor = vec4(coord, abs(sin(time)) * param, 1.0);
}
