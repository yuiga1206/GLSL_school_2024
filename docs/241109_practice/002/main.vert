
attribute vec3 position;
attribute vec4 color; // 頂点カラー @@@
attribute float size; // 点描時のサイズ @@@

varying vec4 vColor; // フラグメントシェーダに送る値 @@@

void main() {
  // フラグメントシェーダへ頂点属性由来の色を渡す
  vColor = color;

  // 頂点座標はひとまずそのまま
  gl_Position = vec4(position, 1.0);

  // 頂点の点描サイズ
  gl_PointSize = size;
}

