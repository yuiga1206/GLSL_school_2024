precision mediump float;

uniform sampler2D prevTexture;     // 前のフレームの進行方向を格納しているテクスチャ
uniform sampler2D positionTexture; // 直近の座標値を格納しているテクスチャ
uniform vec2      resolution;      // フレームバッファの解像度
uniform bool      press;           // 移動フラグ
uniform vec2      mouse;           // 正規化済みのマウス座標

// ----------------------------------------------------------------------------
// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x) {return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r) {return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
       i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
       + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
       + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );  // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                dot(p2,x2), dot(p3,x3) ) );
}
// ----------------------------------------------------------------------------

// Curl Noise -----------------------------------------------------------------
const vec3 DELTA1 = vec3(-19.1, 33.4, 47.2);
const vec3 DELTA2 = vec3(74.2, -124.5, 99.4);
vec3 snoiseVec3(vec3 x) {
  float s0 = snoise(vec3(x));
  float s1 = snoise(vec3(x.y, x.z, x.x) + DELTA1);
  float s2 = snoise(vec3(x.z, x.x, x.y) + DELTA2);
  vec3 c = vec3(s0, s1, s2);
  return c;
}

const float EPSILON = 0.001;
vec3 curlNoise(vec3 v) {
  vec3 dx = vec3(EPSILON, 0.0, 0.0);
  vec3 dy = vec3(0.0, EPSILON, 0.0);
  vec3 dz = vec3(0.0, 0.0, EPSILON);

  vec3 vx0 = snoiseVec3(v - dx);
  vec3 vx1 = snoiseVec3(v + dx);
  vec3 vy0 = snoiseVec3(v - dy);
  vec3 vy1 = snoiseVec3(v + dy);
  vec3 vz0 = snoiseVec3(v - dz);
  vec3 vz1 = snoiseVec3(v + dz);

  float x = vy1.z - vy0.z - vz1.y + vz0.y;
  float y = vz1.x - vz0.x - vx1.z + vx0.z;
  float z = vx1.y - vx0.y - vy1.x + vy0.x;
  return normalize(vec3(x, y, z) * 1.0 / (2.0 * EPSILON));
}
// ----------------------------------------------------------------------------

void main() {
  // gl_FragCoord を解像度で正規化することでテクスチャ座標として使う
  vec2 coord = gl_FragCoord.st / resolution;
  // 直近の進行方向と、現在の座標値を取得
  vec4 prevVelocity = texture2D(prevTexture, coord);
  vec4 position = texture2D(positionTexture, coord);
  vec3 velocity = prevVelocity.xyz;
  // 移動フラグが立っている場合だけ進行方向を変化させる
  if (press == true) {
    // 頂点の現在値をパラメータとして Curl Noise を生成
    velocity = curlNoise(position.xyz);
    // 進行方向はさらにマウスからも影響を受けるようにする
    velocity = normalize(velocity + vec3(mouse, 0.0));
  }
  // 浮動小数点テクスチャへと進行方向を出力
  gl_FragColor = vec4(normalize(velocity), 0.0);
}
