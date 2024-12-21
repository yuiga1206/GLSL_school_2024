precision highp float;

uniform vec2      resolution;
uniform sampler2D projectTexture;

varying vec2 vTexCoord;

void main() {
  vec2 fragmentSize = 1.0 / resolution;

  float previous = texture2D(projectTexture, vTexCoord).y;
  float left     = texture2D(projectTexture, vTexCoord + vec2(-1.0,  0.0) * fragmentSize).x;
  float right    = texture2D(projectTexture, vTexCoord + vec2( 1.0,  0.0) * fragmentSize).x;
  float top      = texture2D(projectTexture, vTexCoord + vec2( 0.0, -1.0) * fragmentSize).x;
  float bottom   = texture2D(projectTexture, vTexCoord + vec2( 0.0,  1.0) * fragmentSize).x;

  float div = (previous + left + right + top + bottom) / 4.0;
  gl_FragColor = vec4(div, previous, 0.0, 0.0);
}

