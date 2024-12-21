precision highp float;

uniform sampler2D densityTexture;

varying vec2 vTexCoord;

void main() {
  vec4 density = texture2D(densityTexture, vTexCoord);
  gl_FragColor = vec4(density.xyz, 1.0);
}

