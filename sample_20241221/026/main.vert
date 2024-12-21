attribute vec2 texCoord;

uniform mat4      mvpMatrix;       // mvp matrix
uniform float     pointSize;       // 頂点のポイントサイズ
uniform sampler2D positionTexture; // 最新の座標を格納したテクスチャ
uniform sampler2D velocityTexture; // 最新の進行方向を格納したテクスチャ

varying vec4 vColor;

void main() {
  // 座標と進行方向を浮動小数点テクスチャより取得
  vec4 position = texture2D(positionTexture, texCoord);
  vec4 velocity = texture2D(velocityTexture, texCoord);
  // 頂点の色は進行方向の影響を受けるようにする
  vColor.rgb = (velocity.xyz + 1.0) * 0.5;
  // 原点からの距離に応じてアルファが変化するように
  vColor.a = 1.0 - smoothstep(1.0, 2.0, length(position.xyz));
  // 浮動小数点テクスチャから読みだした色がそのまま頂点の座標になる
  gl_Position = mvpMatrix * vec4(position.xyz, 1.0);
  // ポイントサイズは座標用テクスチャの W 要素の影響を受けるようにする
  // これによりマウスボタンを離すとポイントサイズが小さくなる
  gl_PointSize = pointSize * max(position.w, 0.5);
}
