
attribute vec3 position;
attribute vec4 color;
attribute float size;

uniform float pointScale; // 頂点のサイズに掛かるスケール @@@

varying vec4 vColor;

void main() {
  vColor = color;
  gl_Position = vec4(position, 1.0);

  // uniform 変数の値を乗算してから出力する @@@
  gl_PointSize = size * pointScale;
}
