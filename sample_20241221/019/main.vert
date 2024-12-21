
attribute vec3 position;   // 座標
attribute vec3 normal;     // 法線
attribute vec2 texCoord;   // テクスチャ座標
uniform mat4 mvpMatrix;    // MVP 行列
uniform mat4 normalMatrix; // 法線変換行列

varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
  // 法線変換行列を使って法線を変換する
  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  // テクスチャ座標はそのまま
  vTexCoord = texCoord;
  // 頂点座標は MVP 行列と乗算
  gl_Position = mvpMatrix * vec4(position, 1.0);
}
