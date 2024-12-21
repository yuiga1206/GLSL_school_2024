precision mediump float;

uniform vec2 resolution; // リセットするフレームバッファの解像度

const float PI  = 3.1415926;
const float PI2 = PI * 2.0;

void main() {
  // gl_FragCoord を解像度で除算し正規化する
  vec2 p = gl_FragCoord.st / resolution;
  // 正規化した座標と PI を使って球体状になるよう座標を算出
  float s =  sin(p.y * PI);
  float x =  cos(p.x * PI2) * s;
  float y = -cos(p.y * PI);
  float z =  sin(p.x * PI2) * s;
  // 算出した座標を色としてフレームバッファに出力する
  gl_FragColor = vec4(normalize(vec3(x, y, z)), 0.0);
}
