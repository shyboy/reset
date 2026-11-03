// GPU 合成层：Three.js (WebGL2) + GLSL
//  1. 把 Canvas2D 手绘层作为纹理铺满屏幕
//  2. 叠加无状态 GPU 粒子（位置完全由 时间+种子 在顶点着色器里算出，离线渲染可任意跳帧）
//  3. 后期：线条抖动(boil)、景深、水彩边缘沉积、颜料颗粒、体积光、柔光晕、调色、纸纹、暗角、颗粒、淡入淡出
//  4. 运动模糊：多个子帧在快门时间内累积
import * as THREE from '../node_modules/three/build/three.module.js';

const W = 1920, H = 1080;

const NOISE_GLSL = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
`;

const POST_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tPaint;
uniform sampler2D tNoise; // 预计算的可平铺噪声：r 低频 fbm, g 高频 fbm, b 中频 fbm, a 白噪声
uniform vec2 uRes;
uniform float uTime, uBoil;
uniform vec3 uTint; uniform float uTintAmt, uSat, uContrast, uBright;
uniform vec4 uSide;   // x: 方向(+1 从左, -1 从右), y: 强度
uniform vec4 uRays;   // xy: 光源(uv), z: 强度, w: 衰减
uniform vec4 uDof;    // x: 焦平面(uv.y), y: 清晰带宽, z: 最大模糊(px), w: 模式(0 横带, 1 径向)
uniform float uVig, uFade, uGrain, uPaper, uWobble, uEdge, uGlow;
varying vec2 vUv;
${NOISE_GLSL}
vec3 tex(vec2 uv){ return texture2D(tPaint, clamp(uv, vec2(0.001), vec2(0.999))).rgb; }
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }

vec3 blurTex(vec2 uv, float r){
  if (r < 0.35) return tex(uv);
  vec3 acc = vec3(0.); float wsum = 0.;
  // 黄金角螺旋采样
  for (int i = 0; i < 16; i++){
    float fi = float(i);
    float rr = sqrt((fi + .5) / 16.) * r;
    float a = fi * 2.39996323;
    vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
    acc += tex(uv + o); wsum += 1.;
  }
  return acc / wsum;
}

void main(){
  vec2 uv = vUv;
  // 手绘线条的“沸腾”：低频噪声位移，每秒 8 次跳变
  vec2 bo = fract(vec2(.37, .71) * uBoil);
  vec2 wob = texture2D(tNoise, uv * vec2(1.4, .8) + bo).rb - .5;
  uv += wob * 2. * uWobble / uRes;

  // 景深
  float blurR = 0.;
  if (uDof.z > 0.) {
    float d = uDof.w < .5 ? abs(uv.y - uDof.x) : length((uv - vec2(.5, uDof.x)) * vec2(uRes.x / uRes.y, 1.));
    blurR = uDof.z * smoothstep(uDof.y * .5, uDof.y * .5 + .18, d);
  }
  vec3 col = blurTex(uv, blurR);

  // 水彩：颜料在色块边缘沉积（边缘略深）
  vec2 px = 1.5 / uRes;
  float gx = lum(tex(uv + vec2(px.x, 0.))) - lum(tex(uv - vec2(px.x, 0.)));
  float gy = lum(tex(uv + vec2(0., px.y))) - lum(tex(uv - vec2(0., px.y)));
  float edge = smoothstep(.02, .25, length(vec2(gx, gy)));
  col *= 1. - uEdge * edge * .22;
  // 颜料颗粒：暗部更明显
  float gran = texture2D(tNoise, uv * uRes / 1024.).g - .5;
  col *= 1. + gran * .09 * (1. - lum(col)) * uEdge;
  // 色块内部的水痕晕染
  float bloomTex = texture2D(tNoise, uv * .9 + .3).r - .5;
  col *= 1. + bloomTex * .05 * uEdge;

  // 柔光晕（亮部外溢）
  if (uGlow > 0.) {
    vec3 g = vec3(0.);
    for (int i = 0; i < 8; i++){
      float a = float(i) * .7854;
      vec3 s = tex(uv + vec2(cos(a), sin(a)) * 14. / uRes);
      g += max(s - .78, 0.);
    }
    col += g / 8. * uGlow * 2.2;
  }

  // 体积光：朝光源方向步进采样亮部
  if (uRays.z > 0.) {
    vec2 dir = (uRays.xy - uv) / 20.;
    vec2 p = uv; float decay = 1.; vec3 rays = vec3(0.);
    for (int i = 0; i < 20; i++){
      p += dir;
      vec3 s = tex(p);
      rays += max(s - .72, 0.) * decay;
      decay *= uRays.w;
    }
    col += rays / 20. * uRays.z * vec3(1., .9, .72) * 3.;
  }

  // 调色
  col = mix(col, col * uTint, uTintAmt);
  float L = lum(col);
  col = mix(vec3(L), col, uSat);
  col = (col - .5) * uContrast + .5;
  col *= uBright;
  // 侧光
  if (uSide.y > 0.) {
    float sx = uSide.x > 0. ? uv.x : 1. - uv.x;
    float k = smoothstep(1.1, -.1, sx) * (.6 + .4 * uv.y);
    col = mix(col, col * vec3(1.12, 1.02, .86) + vec3(.06, .04, .0), k * uSide.y);
    col *= 1. - (1. - k) * uSide.y * .18;
  }

  // 纸纹（程序化：纤维 + 低频斑驳）
  float paper = texture2D(tNoise, uv * uRes / 2400.).b * .6 + texture2D(tNoise, uv * uRes / 300.).g * .4;
  col *= mix(1., .92 + paper * .14, uPaper);

  // 暗角
  vec2 q = vUv - .5; q.x *= uRes.x / uRes.y;
  col *= 1. - uVig * smoothstep(.35, 1.05, length(q));
  // 胶片颗粒
  col += (texture2D(tNoise, vUv * uRes / 512. + fract(vec2(.13, .57) * floor(uTime * 24.))).a - .5) * uGrain;
  // 淡入淡出
  col = mix(col, vec3(.07, .06, .05), uFade);
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
`;

const QUAD_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

// ---------- 粒子 ----------
const PART_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uT, uLife, uBurst, uBurstSpread, uSize, uSizeVar, uGrowth, uScale, uFadeIn, uFadeOut, uTurb, uTurbF, uH;
uniform vec2 uOrigin, uSpread, uVel, uVelVar, uGrav;
varying float vAlpha, vAng, vRand;
void main(){
  float i = aSeed.w;
  float age = uBurst > .5 ? uT - aSeed.x * uBurstSpread : mod(uT + (1. - i) * uLife, uLife);
  float life = age / uLife;
  vRand = aSeed.y;
  vec2 p0 = uOrigin + (aSeed.yz - .5) * uSpread;
  vec2 v = uVel + (vec2(fract(aSeed.x * 7.13 + aSeed.z * 3.1), fract(aSeed.y * 5.71 + aSeed.x * 2.3)) - .5) * uVelVar;
  vec2 p = p0 + v * age + .5 * uGrav * age * age;
  p.x += sin(age * uTurbF + aSeed.x * 6.283) * uTurb * life;
  p.y += cos(age * uTurbF * .73 + aSeed.z * 6.283) * uTurb * .5 * life;
  vec2 vc = v + uGrav * age;
  vAng = atan(-vc.y, vc.x);
  float alive = step(0., age) * step(life, 1.);
  vAlpha = alive * smoothstep(0., uFadeIn, life) * (1. - smoothstep(1. - uFadeOut, 1., life));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, uH - p.y, 0., 1.);
  gl_PointSize = uSize * (1. - uSizeVar * .5 + uSizeVar * aSeed.z) * (1. + uGrowth * life) * uScale;
}
`;
const PART_FRAG = /* glsl */`
uniform vec3 uColor, uColor2; uniform float uAlpha, uShape, uStretch;
varying float vAlpha, vAng, vRand;
void main(){
  vec2 c = gl_PointCoord - .5; c.y = -c.y;
  float ca = cos(vAng), sa = sin(vAng);
  vec2 r = vec2(c.x * ca + c.y * sa, -c.x * sa + c.y * ca);
  float a;
  if (uShape < .5) {               // 柔和圆点（热气、白气、尘埃）
    a = smoothstep(.5, .0, length(c));
  } else if (uShape < 1.5) {       // 拉长的水滴 / 风线
    r.y *= uStretch;
    a = smoothstep(.5, .3, length(r));
  } else if (uShape < 2.5) {       // 星点闪光
    float d = length(c);
    a = smoothstep(.5, .1, d) * .5 + smoothstep(.06, .0, min(abs(c.x), abs(c.y))) * smoothstep(.5, .1, d);
  } else {                          // 纸屑纤维
    r.y *= uStretch;
    a = smoothstep(.5, .35, length(r)) * (.7 + .3 * vRand);
  }
  vec3 col = mix(uColor, uColor2, vRand);
  gl_FragColor = vec4(col, a * vAlpha * uAlpha);
  if (gl_FragColor.a < .003) discard;
}
`;

const PART_TYPES = {
  // 屋檐滴水
  drip:  { count: 70, life: 1.2, size: 9, sizeVar: .4, vel: [0, 380], velVar: [0, 80], grav: [0, 900], shape: 1, stretch: 4, color: '#c8d6df', color2: '#eef3f5', alpha: .75, fadeIn: .05, fadeOut: .2 },
  // 杯子热气
  steam: { count: 50, life: 2.4, size: 9, sizeVar: .6, growth: 1.3, vel: [0, -55], velVar: [16, 20], grav: [0, -6], turb: 16, turbF: 2.2, shape: 0, color: '#ffffff', color2: '#fbf4e8', alpha: .3, fadeIn: .2, fadeOut: .5 },
  // 呼出的白气
  breath: { count: 36, life: 1.3, size: 9, sizeVar: .5, growth: 1.6, vel: [70, -18], velVar: [30, 18], turb: 8, turbF: 3, shape: 0, color: '#ffffff', color2: '#f3f6f8', alpha: .38, fadeIn: .1, fadeOut: .6 },
  // 晨光里的浮尘
  dust:  { count: 140, life: 9, size: 5, sizeVar: .8, vel: [10, -6], velVar: [14, 10], turb: 30, turbF: .6, shape: 0, color: '#fff3d6', color2: '#ffffff', alpha: .55, fadeIn: .2, fadeOut: .3 },
  // 海风
  wind:  { count: 90, life: 1.1, size: 46, sizeVar: .6, vel: [-1500, -60], velVar: [500, 120], turb: 40, turbF: 4, shape: 1, stretch: 10, color: '#ffffff', color2: '#e3ebee', alpha: .45, fadeIn: .2, fadeOut: .4 },
  // 盖戳时迸出的橙色光点
  stamp: { count: 46, life: .9, burst: 1, burstSpread: .06, size: 16, sizeVar: .7, vel: [0, 0], velVar: [900, 900], grav: [0, 500], shape: 2, color: '#f0904a', color2: '#ffd2a0', alpha: .95, fadeIn: .01, fadeOut: .6 },
  // 展开时飘出的纸屑纤维
  paper: { count: 40, life: 1.4, burst: 1, burstSpread: .15, size: 14, sizeVar: .6, vel: [60, -120], velVar: [380, 260], grav: [0, 160], turb: 20, turbF: 5, shape: 3, stretch: 5, color: '#f6efe0', color2: '#e0b58a', alpha: .9, fadeIn: .02, fadeOut: .5 },
  // 恍然大悟 / 温暖时刻的小光点
  spark: { count: 24, life: 1.6, burst: 1, burstSpread: .4, size: 18, sizeVar: .6, vel: [0, -60], velVar: [220, 140], grav: [0, 30], turb: 10, turbF: 3, shape: 2, color: '#fff2c8', color2: '#ffffff', alpha: .9, fadeIn: .1, fadeOut: .5 },
  // 雨后的细雾（序幕）
  mist:  { count: 50, life: 7, size: 260, sizeVar: .5, growth: .4, vel: [30, -4], velVar: [20, 6], turb: 20, turbF: .3, shape: 0, color: '#c9d3dc', color2: '#e7ecef', alpha: .12, fadeIn: .3, fadeOut: .4 },
};

function makeEmitterMesh(type) {
  const cfg = PART_TYPES[type];
  const n = cfg.count;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  let s = 12345 + type.length * 77;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) { seed[i * 4] = r(); seed[i * 4 + 1] = r(); seed[i * 4 + 2] = r(); seed[i * 4 + 3] = i / n; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const c1 = new THREE.Color(cfg.color), c2 = new THREE.Color(cfg.color2 ?? cfg.color);
  const mat = new THREE.ShaderMaterial({
    vertexShader: PART_VERT, fragmentShader: PART_FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uT: { value: 0 }, uLife: { value: cfg.life }, uBurst: { value: cfg.burst ?? 0 }, uBurstSpread: { value: cfg.burstSpread ?? 0 },
      uSize: { value: cfg.size }, uSizeVar: { value: cfg.sizeVar ?? 0 }, uGrowth: { value: cfg.growth ?? 0 }, uScale: { value: 1 },
      uFadeIn: { value: cfg.fadeIn ?? .1 }, uFadeOut: { value: cfg.fadeOut ?? .3 }, uTurb: { value: cfg.turb ?? 0 }, uTurbF: { value: cfg.turbF ?? 1 },
      uH: { value: H }, uOrigin: { value: new THREE.Vector2() }, uSpread: { value: new THREE.Vector2() },
      uVel: { value: new THREE.Vector2(...cfg.vel) }, uVelVar: { value: new THREE.Vector2(...(cfg.velVar ?? [0, 0])) }, uGrav: { value: new THREE.Vector2(...(cfg.grav ?? [0, 0])) },
      uColor: { value: c1 }, uColor2: { value: c2 }, uAlpha: { value: cfg.alpha }, uShape: { value: cfg.shape }, uStretch: { value: cfg.stretch ?? 1 },
    },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData = { type, cfg };
  return pts;
}

// 可平铺的噪声纹理（一次性在 CPU 上生成）
function buildNoiseTexture(N = 512) {
  const data = new Uint8Array(N * N * 4);
  let sd = 987654321;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const lattice = (P) => { const a = new Float32Array(P * P); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const vn = (lat, P, x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const g = (i, j) => lat[((j % P + P) % P) * P + ((i % P + P) % P)];
    return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v;
  };
  const fbmT = (base) => {
    const lats = []; for (let o = 0; o < 5; o++) { const P = base << o; lats.push([lattice(P), P]); }
    return (x, y) => { let s = 0, a = .5; for (const [lat, P] of lats) { s += a * vn(lat, P, x * P, y * P); a *= .5; } return s / .97; };
  };
  const lo = fbmT(4), hi = fbmT(32), mid = fbmT(12);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / N, y = j / N, k = (j * N + i) * 4;
    data[k] = lo(x, y) * 255; data[k + 1] = hi(x, y) * 255; data[k + 2] = mid(x, y) * 255; data[k + 3] = rnd() * 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function createGPU(outCanvas, paintCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: outCanvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(outCanvas.width, outCanvas.height, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const RW = outCanvas.width, RH = outCanvas.height;

  const paintTex = new THREE.CanvasTexture(paintCanvas);
  paintTex.colorSpace = THREE.NoColorSpace;
  paintTex.minFilter = THREE.LinearFilter; paintTex.magFilter = THREE.LinearFilter; paintTex.generateMipmaps = false;

  const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const rtScene = new THREE.WebGLRenderTarget(RW, RH, rtOpts);
  const rtPost = new THREE.WebGLRenderTarget(RW, RH, rtOpts);
  const rtAccum = new THREE.WebGLRenderTarget(RW, RH, { ...rtOpts, type: THREE.HalfFloatType });

  const orthoPx = new THREE.OrthographicCamera(0, W, H, 0, -1, 1);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);

  // 场景：手绘层 + 粒子
  const scene = new THREE.Scene();
  const bg = new THREE.Mesh(quadGeo, new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
    uniforms: { t: { value: paintTex } },
  }));
  bg.frustumCulled = false;
  const bgScene = new THREE.Scene(); bgScene.add(bg);
  const pools = {};
  for (const type of Object.keys(PART_TYPES)) {
    pools[type] = [];
    for (let k = 0; k < 4; k++) { const m = makeEmitterMesh(type); m.visible = false; scene.add(m); pools[type].push(m); }
  }

  // 后期
  const post = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      tPaint: { value: rtScene.texture }, tNoise: { value: buildNoiseTexture() }, uRes: { value: new THREE.Vector2(RW, RH) }, uTime: { value: 0 }, uBoil: { value: 0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) }, uTintAmt: { value: 0 }, uSat: { value: 1 }, uContrast: { value: 1 }, uBright: { value: 1 },
      uSide: { value: new THREE.Vector4() }, uRays: { value: new THREE.Vector4() }, uDof: { value: new THREE.Vector4() },
      uVig: { value: .3 }, uFade: { value: 0 }, uGrain: { value: .025 }, uPaper: { value: 1 }, uWobble: { value: 1.6 }, uEdge: { value: 1 }, uGlow: { value: 0 },
    },
  });
  const postScene = new THREE.Scene();
  const pq = new THREE.Mesh(quadGeo, post); pq.frustumCulled = false; postScene.add(pq);

  // 累积（运动模糊）
  const accMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    fragmentShader: 'uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.); }',
    uniforms: { t: { value: rtPost.texture }, w: { value: 1 } },
  });
  const accScene = new THREE.Scene(); const aq = new THREE.Mesh(quadGeo, accMat); aq.frustumCulled = false; accScene.add(aq);
  const blitMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.); }',
    uniforms: { t: { value: rtAccum.texture } },
  });
  const blitScene = new THREE.Scene(); const bq = new THREE.Mesh(quadGeo, blitMat); bq.frustumCulled = false; blitScene.add(bq);

  function setEmitters(fx) {
    for (const type in pools) for (const m of pools[type]) m.visible = false;
    const used = {};
    for (const e of fx || []) {
      const pool = pools[e.type]; if (!pool) continue;
      const slot = used[e.type] = (used[e.type] ?? -1) + 1;
      const m = pool[slot]; if (!m) continue;
      const u = m.material.uniforms, cfg = m.userData.cfg;
      m.visible = true;
      u.uT.value = e.t;
      u.uOrigin.value.set(e.x, e.y);
      u.uSpread.value.set(...(e.spread ?? [0, 0]));
      // scale：镜头缩放。粒子的大小、速度、扰动都随之缩放，保持在世界里的尺度一致
      const k = e.scale ?? 1;
      u.uScale.value = k;
      u.uTurb.value = (e.turb ?? cfg.turb ?? 0) * k;
      u.uAlpha.value = cfg.alpha * (e.alpha ?? 1);
      const vel = e.vel ?? cfg.vel; u.uVel.value.set(vel[0] * k, vel[1] * k);
      const vv = e.velVar ?? cfg.velVar ?? [0, 0]; u.uVelVar.value.set(vv[0] * k, vv[1] * k);
      const gr = e.grav ?? cfg.grav ?? [0, 0]; u.uGrav.value.set(gr[0] * k, gr[1] * k);
      u.uLife.value = e.life ?? cfg.life;
      u.uSize.value = e.size ?? cfg.size;
      if (e.color) u.uColor.value.set(e.color); else u.uColor.value.set(cfg.color);
    }
  }

  function setPost(m) {
    const u = post.uniforms, g = m.grade || {};
    u.uTime.value = m.t; u.uBoil.value = Math.floor(m.t * 8);
    u.uTint.value.set(...(g.tint ?? [1, 1, 1])); u.uTintAmt.value = g.tintAmt ?? 0;
    u.uSat.value = g.sat ?? 1; u.uContrast.value = g.contrast ?? 1; u.uBright.value = g.bright ?? 1;
    u.uSide.value.set(g.side?.[0] ?? 0, g.side?.[1] ?? 0, 0, 0);
    // 体积光与景深的坐标以“屏幕左上为原点、0..1”给出，这里换成 uv（左下为原点）
    if (g.rays) u.uRays.value.set(g.rays[0], 1 - g.rays[1], g.rays[2], g.rays[3] ?? .96); else u.uRays.value.set(0, 0, 0, 0);
    if (g.dof) u.uDof.value.set(1 - g.dof[0], g.dof[1], g.dof[2], g.dof[3] ?? 0); else u.uDof.value.set(0, 0, 0, 0);
    u.uVig.value = g.vig ?? .32; u.uFade.value = m.fade ?? 0; u.uGlow.value = g.glow ?? 0;
    u.uWobble.value = g.wobble ?? 1.6; u.uEdge.value = g.edge ?? 1; u.uPaper.value = g.paper ?? 1;
  }

  function renderOne(m, target) {
    paintTex.needsUpdate = true;
    setEmitters(m.fx);
    renderer.setRenderTarget(rtScene);
    renderer.autoClear = true; renderer.render(bgScene, quadCam);
    renderer.autoClear = false; renderer.render(scene, orthoPx);
    renderer.autoClear = true;
    setPost(m);
    renderer.setRenderTarget(target);
    renderer.render(postScene, quadCam);
  }

  // paint(t) 负责把该时刻的手绘层画进 paintCanvas，并返回元数据 {t, grade, fx, fade}
  function frame(t, paint, opts = {}) {
    const samples = opts.samples ?? 1;
    if (samples <= 1) { renderOne(paint(t), null); return; }
    const shutter = (opts.shutter ?? .5) / (opts.fps ?? 60);
    renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 1); renderer.clear();
    accMat.uniforms.w.value = 1 / samples;
    for (let k = 0; k < samples; k++) {
      const ts = t + (k / samples - .5) * shutter;
      renderOne(paint(Math.max(0, ts)), rtPost);
      renderer.setRenderTarget(rtAccum); renderer.autoClear = false;
      renderer.render(accScene, quadCam); renderer.autoClear = true;
    }
    renderer.setRenderTarget(null);
    renderer.render(blitScene, quadCam);
  }

  return { frame, renderer, info: () => renderer.getContext().getParameter(renderer.getContext().VERSION) };
}
