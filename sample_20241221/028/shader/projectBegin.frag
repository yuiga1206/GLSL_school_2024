precision highp float;

uniform vec2      resolution;
uniform sampler2D velocityTexture;

varying vec2 vTexCoord;

void main() {
  vec2 fragmentSize = 1.0 / resolution;

  float left   = texture2D(velocityTexture, vTexCoord + vec2(-1.0,  0.0) * fragmentSize).x;
  float right  = texture2D(velocityTexture, vTexCoord + vec2( 1.0,  0.0) * fragmentSize).x;
  float top    = texture2D(velocityTexture, vTexCoord + vec2( 0.0, -1.0) * fragmentSize).y;
  float bottom = texture2D(velocityTexture, vTexCoord + vec2( 0.0,  1.0) * fragmentSize).y;

  float div = -0.5 * (right - left) + -0.5 * (bottom - top);
  gl_FragColor = vec4(0.0, div, 0.0, 0.0);
}

