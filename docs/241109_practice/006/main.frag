precision mediump float;

varying vec4 vColor;
varying float vOpacity;

void main() {
  // gl_FragColor = vColor;
  // gl_FragColor = vec4(vColor.rgb, 1);
  gl_FragColor = vec4(vColor.rgb, vOpacity);
}
