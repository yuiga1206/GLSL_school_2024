precision highp float;

uniform vec2      resolution;
uniform sampler2D velocityTexture;
uniform sampler2D projectTexture;

varying vec2 vTexCoord;

void main() {
  vec2 fragmentSize = 1.0 / resolution;

  vec4 velocity = texture2D(velocityTexture, vTexCoord);

  float left   = texture2D(projectTexture, vTexCoord + vec2(-1.0,  0.0) * fragmentSize).x;
  float right  = texture2D(projectTexture, vTexCoord + vec2( 1.0,  0.0) * fragmentSize).x;
  float top    = texture2D(projectTexture, vTexCoord + vec2( 0.0, -1.0) * fragmentSize).x;
  float bottom = texture2D(projectTexture, vTexCoord + vec2( 0.0,  1.0) * fragmentSize).x;

  float x = 0.5 * (right - left);
  float y = 0.5 * (bottom - top);
  gl_FragColor = velocity - vec4(x, y, 0.0, 0.0);
}

