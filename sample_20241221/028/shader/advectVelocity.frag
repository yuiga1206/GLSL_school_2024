precision highp float;

uniform vec2      resolution;
uniform sampler2D velocityTexture;
uniform float     deltaTime;
uniform float     attenuation;

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
  vec2 aspect = vec2(1.0, resolution.x / resolution.y);
  vec4 velocity = texture2D(velocityTexture, vTexCoord);
  vec2 previousCoord = vTexCoord - deltaTime * (velocity.xy * aspect);
  float decay = 1.0 - attenuation;
  gl_FragColor = interpolate(velocityTexture, previousCoord) * vec4(decay, decay, 1.0, 1.0);
}

