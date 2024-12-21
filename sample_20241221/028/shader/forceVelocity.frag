precision highp float;

uniform vec2      resolution;
uniform sampler2D velocityTexture;
uniform float     deltaTime;
uniform float     forceRadius;
uniform float     forceIntensity;
uniform vec2      forceDirection;
uniform vec2      forceOrigin;

varying vec2 vTexCoord;

void main() {
  float aspect = resolution.x / resolution.y;
  vec4 velocity = texture2D(velocityTexture, vTexCoord);
  vec2 coord = (vTexCoord * 2.0 - 1.0) - forceOrigin;
  float forceDistance = length(coord * vec2(aspect, 1.0));
  float intensity = 1.0 - smoothstep(forceRadius - forceRadius * 0.1, forceRadius, forceDistance);
  vec2 force = deltaTime * intensity * forceDirection * forceIntensity;

  gl_FragColor = velocity + vec4(force, 0.0, 0.0);
}

