precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform vec4 param;

const float EPS = 0.0001; // イプシロン（微小な値の意）
const int ITR = 16; // イテレーション回数

// 球の距離関数
// レイの先端の位置を引数から受け取り、該当のオブジェクトとの距離を返す
float map(vec3 p) {
  float radius = 2.0 + param.y;
  return length(p) - radius;
}

void main() {
  // まずスクリーン座標を正規化する
    // ピクセル座標を2倍して、解像度を引く
      // 0 ~ 1000, 0 ~ 500 -> 
      // 0 ~ 2000, 0 ~ 1000 -> 
      // -1000 ~ 1000, -500 ~ 500
    // -2 ~ 2, -1 ~ 1
    // 短辺のほうを -1 ~ 1 に合わせて、長辺は相対的な長さになるようにしている
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  // 正規化したスクリーン座標に Z の情報を与え、さらに正規化する
  float focus = 1.0 + param.x; // 奥行きの、どこにフォーカスするか（大きくも小さくもなり得る）
  // レイの向きを決めるとき、フォーカスする深度は変化するため、向きだけに注目したいから単位化する
  vec3 rayDirection = normalize(vec3(p, -focus));
  // ↑ normalize で単位化（=正規化）する。つまり向きだけに注目する

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
    // ここでは単に RGB が 1.0、つまり白にする
    destColor = vec3(1.0);
  }

  gl_FragColor = vec4(destColor, 1.0);
}
