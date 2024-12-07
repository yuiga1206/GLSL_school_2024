precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float PI = 3.1415926;

void main() {
  // 正規化（この時点では 0.0 ～ 1.0）
  vec2 coord = gl_FragCoord.xy / resolution;
  // 正負の方向に -1.0 ～ 1.0 で値が分布するように変換
  vec2 signedCoord = coord * 2.0 - 1.0;

  // ０．特に座標は変換しない場合

  // １．モザイク化（低解像度化）する
  // float block = param.w * 50.0;
  // // floor ：小数点以下を切り捨てる
  // signedCoord = floor(signedCoord * block) / block;

  // ２．極座標変換（モザイク化の前に極座標変換してもおもしろい）
  // ★★ 極座標変換：xを角度に、yを距離に代入する
  // アークタンジェント atan
  float a = atan(signedCoord.y, signedCoord.x);
  float r = length(signedCoord) * 2.0 - 1.0;
  signedCoord = vec2(a / PI, r);

  // ループを使ってラインを複数処理する
  float lightness = 0.0;
  for (int i = 0; i < 8; ++i) {
    float f = 0.25 + float(i) * 0.25;
    lightness += 0.01 / abs(signedCoord.y + sin(signedCoord.x * param.z + time * f) * param.y);
    // lightness += 0.01 / abs(signedCoord.y + sin(signedCoord.x * param.z * 100.0 + time * f) * param.y);
  }

  vec3 rgb = vec3(coord, abs(sin(time)) * param.x);
  gl_FragColor = vec4(rgb * lightness, 1.0);
}
