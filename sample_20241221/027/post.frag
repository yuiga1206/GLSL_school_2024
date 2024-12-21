precision mediump float;
uniform sampler2D textureUnit;
varying vec2 vTexCoord;

void main() {
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  gl_FragColor = vec4(vec3(samplerColor.r), 1.0);
}

