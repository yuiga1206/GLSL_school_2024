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

  // １．座標系を複製する
  // float scale = 8.0; // 正規化した座標系に適用するスケール
  // float space = 2.0; // 複製された空間の広さ
  // signedCoord = mod(signedCoord * scale, space) - space * 0.5;

  // ２．座標系を回転する
  // float s = sin(time * param.w);
  // float c = cos(time * param.w);
  // signedCoord = mat2(c, -s, s, c) * signedCoord;

  // ループを使ってラインを複数処理する
  float lightness = 0.0;
  for (int i = 0; i < 8; ++i) {
    float f = 0.25 + float(i) * 0.25;
    lightness += 0.01 / abs(signedCoord.y + sin(signedCoord.x * param.z + time * f) * param.y);
  }

  vec3 rgb = vec3(coord, abs(sin(time)) * param.x);
  gl_FragColor = vec4(rgb * lightness, 1.0);
}
