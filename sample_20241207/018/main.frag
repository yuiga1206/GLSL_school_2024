precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float EPS = 0.0001; // イプシロン（微小な値の意）
const int ITR = 16; // イテレーション回数

// 座標系を一定の範囲に限定することで複製する @@@
vec3 repetition(vec3 p, vec3 width) {
  return mod(p, width) - width * 0.5;
}
// 球の距離関数
float map(vec3 p) {
  float radius = 2.0 + param.y;
  float space = 5.0 + param.w * 20.0;
  // 座標は repetition を通した結果を使う @@@
  return length(repetition(p, vec3(space))) - radius;
}

// 法線を算出するための関数
vec3 generateNormal(vec3 p) {
  return normalize(vec3(
    map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
    map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
    map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))
  ));
}

void main() {
  // まずスクリーン座標を正規化する
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  // 正規化したスクリーン座標に Z の情報を与え、さらに正規化する
  float focus = 1.0 + param.x;
  vec3 rayDirection = normalize(vec3(p, -focus));

  // レイの原点
  vec3 origin = vec3(0.0, 0.0, 5.0 - time);
  // レイの初期位置はレイの原点に等しい
  vec3 ray = origin;
  // 距離を保持しておくための変数を先に宣言しておく
  float dist = 0.0;

  // ループ構文で、レイをマーチ（行進）させる
  for (int i = 0; i < ITR; ++i) {
    // 距離関数を使って距離を計測
    dist = map(ray);
    // レイを計測した距離分だけ進める
    ray += rayDirection * dist;
    // 距離が十分に小さい場合はループを抜ける（衝突とみなしている）
    if (dist < EPS) {
      break;
    }
  }

  // 最終的に出力される色（初期値は 0.0 にしているので黒になる）
  vec3 destColor = vec3(0.0);

  // 最終的な距離が十分に小さい場合、衝突とみなして色を変える
  if (dist < EPS) {
    // 衝突とみなされる場合に限り、法線を算出する
    vec3 normal = generateNormal(ray);
    // 算出した法線で拡散光（diffuse lighting）
    vec3 light = normalize(vec3(1.0, 1.0, param.z));
    float diffuse = max(dot(normal, light), 0.1);
    destColor = vec3(diffuse);
  }

  gl_FragColor = vec4(destColor, 1.0);
}
