precision highp float;

uniform vec2      resolution;
uniform sampler2D densityTexture;
uniform float     deltaTime;
uniform float     diffuse;

varying vec2 vTexCoord;

void main() {
  vec2 fragmentSize = 1.0 / resolution;

  vec4 center = texture2D(densityTexture, vTexCoord + vec2( 0.0,  0.0) * fragmentSize);
  vec4 left   = texture2D(densityTexture, vTexCoord + vec2(-1.0,  0.0) * fragmentSize);
  vec4 right  = texture2D(densityTexture, vTexCoord + vec2( 1.0,  0.0) * fragmentSize);
  vec4 top    = texture2D(densityTexture, vTexCoord + vec2( 0.0, -1.0) * fragmentSize);
  vec4 bottom = texture2D(densityTexture, vTexCoord + vec2( 0.0,  1.0) * fragmentSize);

  float a = deltaTime * diffuse * resolution.x * resolution.y;
  vec4 dest = (center + a * (top + bottom + left + right)) / (1.0 + 4.0 * a);

  gl_FragColor = dest;
}

