precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float EPS = 0.0001; // イプシロン（微小な値の意）
const int ITR = 16; // イテレーション回数

// 球の距離関数
float map(vec3 p) {
  float radius = 2.0 + param.y;
  return length(p) - radius;
}

// 法線を算出するための関数 @@@
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
  vec3 origin = vec3(0.0, 0.0, 5.0);
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
    // 衝突とみなされる場合に限り、法線を算出する @@@
    vec3 normal = generateNormal(ray);
    // 算出した法線で拡散光（diffuse lighting）を計算する @@@
    vec3 light = normalize(vec3(1.0, 1.0, param.z));
    // （法線もライトの向きも）両方とも単位化されていることが重要
    float diffuse = max(dot(normal, light), 0.1);
    destColor = vec3(diffuse);

    // ライトの色を変更したい
    // 内積を使って求めた値が、明るさとして使えるな！
    // vec3 rgb = vec3(1.0, 0.8, 0.5);
    // destColor = rgb * vec3(diffuse);

    // 色デバッグ：資料P66~67
    // 法線を色で確認
    // destColor = normal;
  }

  gl_FragColor = vec4(destColor, 1.0);
}
