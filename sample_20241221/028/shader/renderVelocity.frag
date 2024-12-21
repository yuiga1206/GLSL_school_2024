precision highp float;

uniform sampler2D velocityTexture;

varying vec2 vTexCoord;

void main() {
  vec4 velocity = texture2D(velocityTexture, vTexCoord);
  vec2 nVelocity = vec2(0.5);
  if (length(velocity.xy) > 0.0) {
    nVelocity = normalize(velocity.xy) * 0.5 + 0.5;
  }
  gl_FragColor = vec4(nVelocity, 0.5, 1.0);
}

