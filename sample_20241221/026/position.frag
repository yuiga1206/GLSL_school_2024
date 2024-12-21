precision mediump float;

uniform sampler2D prevTexture;     // 前のフレームの座標を格納しているテクスチャ
uniform sampler2D velocityTexture; // 現在の進行方向を格納しているテクスチャ
uniform vec2      resolution;      // フレームバッファの解像度
uniform bool      press;           // 移動フラグ
uniform float     speed;           // 速度係数

void main() {
  // gl_FragCoord を解像度で正規化することでテクスチャ座標として使う
  vec2 coord = gl_FragCoord.st / resolution;
  // 直近の座標と、現在の進行方向を取得
  vec4 prevPosition = texture2D(prevTexture, coord);
  vec4 velocity = texture2D(velocityTexture, coord);
  // 直近の座標値の W 要素は減衰するように
  float power = prevPosition.w * 0.95;
  // ただし移動フラグが立っている場合は減衰を無効化
  if (press == true) {
    power = 1.0;
  }
  // 直近の座標と最新の進行方向を使って現在座標値を更新する
  vec3 position = prevPosition.xyz + velocity.xyz * power * speed;
  // 原点からの距離が一定以上である場合は原点付近に瞬間移動させる
  if (length(position) > 2.0) {
    // 原点から 0.1 の距離の位置に強制移動
    position = normalize(position) * 0.1;
  }
  // 浮動小数点テクスチャへ座標と移動量を出力
  gl_FragColor = vec4(position, power);
}
