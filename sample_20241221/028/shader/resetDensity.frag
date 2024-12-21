precision highp float;

varying vec2 vTexCoord;

void main() {
  float x = floor(gl_FragCoord.x / 50.0) * 50.0;
  float y = floor(gl_FragCoord.y / 50.0) * 50.0;
  float outColor = step(mod(x + y, 100.0), 1.0);
  gl_FragColor = vec4(vec3(outColor), 1.0);
}

