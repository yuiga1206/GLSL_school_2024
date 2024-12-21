precision highp float;

uniform vec2      resolution;
uniform sampler2D velocityTexture;
uniform sampler2D densityTexture;
uniform float     deltaTime;
uniform float     additionalVelocity;

varying vec2 vTexCoord;

vec4 interpolate(sampler2D tex, vec2 coord) {
  vec2 fragmentSize = 1.0 / resolution;
  vec2 texel = coord * resolution - 0.5;
  vec2 iCoord = floor(texel);
  vec2 fCoord = fract(texel);
  vec4 a = texture2D(tex, (iCoord + vec2(0.5, 0.5)) * fragmentSize);
  vec4 b = texture2D(tex, (iCoord + vec2(1.5, 0.5)) * fragmentSize);
  vec4 c = texture2D(tex, (iCoord + vec2(0.5, 1.5)) * fragmentSize);
  vec4 d = texture2D(tex, (iCoord + vec2(1.5, 1.5)) * fragmentSize);
  return mix(mix(a, b, fCoord.s), mix(c, d, fCoord.s), fCoord.t);
}

void main() {
  vec4 velocity = texture2D(velocityTexture, vTexCoord);
  vec2 previousCoord = vTexCoord - deltaTime * velocity.xy;
  vec4 dest = interpolate(densityTexture, previousCoord);

  vec4 velocityColor = vec4(0.4, 0.2, 1.0, 0.0) * length(velocity.xy);
  float decay = 0.95 + 0.05 * step(additionalVelocity, 0.5);

  gl_FragColor = dest * vec4(vec3(decay), 1.0) + velocityColor * additionalVelocity;
}

