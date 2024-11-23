
attribute vec3 position;
attribute vec2 texCoord; // テクスチャ座標 @@@
uniform mat4 mvpMatrix;

varying vec2 vTexCoord; // テクスチャ座標用 @@@

void main() {
  // テクスチャの読み出しはフラグメントシェーダで @@@
  vTexCoord = texCoord;

  gl_Position = mvpMatrix * vec4(position, 1.0);
}
