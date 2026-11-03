// 骨骼系统：骨骼层级 + IK + 确定性弹簧次级运动
// 离线渲染要求：任何一帧的结果只取决于 (镜头, 镜头内时间)，与渲染顺序、分片无关。
'use strict';

class Bone {
  constructor(name, parent, x, y, rot = 0, len = 0) {
    Object.assign(this, { name, parent, x, y, rot, len });
    this.wx = 0; this.wy = 0; this.wrot = 0;
  }
}

class Skeleton {
  constructor() { this.bones = []; this.map = {}; }
  add(name, parentName, x, y, rot = 0, len = 0) {
    const b = new Bone(name, parentName ? this.map[parentName] : null, x, y, rot, len);
    this.bones.push(b); this.map[name] = b; return b;
  }
  get(n) { return this.map[n]; }
  // 前向运动学：父骨骼先于子骨骼添加，按顺序求世界变换
  solve() {
    for (const b of this.bones) {
      if (!b.parent) { b.wx = b.x; b.wy = b.y; b.wrot = b.rot; continue; }
      const p = b.parent, c = Math.cos(p.wrot), s = Math.sin(p.wrot);
      b.wx = p.wx + b.x * c - b.y * s;
      b.wy = p.wy + b.x * s + b.y * c;
      b.wrot = p.wrot + b.rot;
    }
    return this;
  }
  tip(name) { const b = this.map[name]; return [b.wx + Math.cos(b.wrot) * b.len, b.wy + Math.sin(b.wrot) * b.len]; }
  // CCD IK：让骨骼链末端指向目标
  ccd(chain, tx, ty, iters = 8) {
    for (let k = 0; k < iters; k++) {
      for (let i = chain.length - 1; i >= 0; i--) {
        this.solve();
        const b = this.map[chain[i]];
        const [ex, ey] = this.tip(chain[chain.length - 1]);
        const a1 = Math.atan2(ey - b.wy, ex - b.wx), a2 = Math.atan2(ty - b.wy, tx - b.wx);
        let d = a2 - a1; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        b.rot += d;
      }
    }
    return this.solve();
  }
}

// 解析两骨骼 IK（手臂、腿）：返回 [肘x, 肘y, 手x, 手y]
function ik2(sx, sy, tx, ty, l1, l2, bendSign) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.01;
  if (d > maxd) { tx = sx + dx / d * maxd; ty = sy + dy / d * maxd; dx = tx - sx; dy = ty - sy; d = maxd; }
  if (d < 1e-3) d = 1e-3;
  const a = Math.atan2(dy, dx);
  const cosB = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const b = Math.acos(cosB) * bendSign;
  return [sx + Math.cos(a + b) * l1, sy + Math.sin(a + b) * l1, tx, ty];
}

// ---------- 确定性弹簧（次级运动） ----------
// driver(lt) 返回角色根的 {x, y, rot}；弹簧对根的加速度产生反向惯性。
// 用固定步长从镜头起点积分，结果缓存，顺序渲染时增量推进。
const SPRING_DT = 1 / 240;
const SPRING_CACHE = new Map();
function springs(key, lt, driver, specs) {
  let c = SPRING_CACHE.get(key);
  const target = Math.max(0, Math.floor(lt / SPRING_DT));
  if (!c || c.step > target) {
    const r0 = driver(0);
    c = { step: 0, prev: r0, prev2: r0, st: specs.map(() => ({ a: 0, v: 0 })) };
    SPRING_CACHE.set(key, c);
  }
  while (c.step < target) {
    const t = (c.step + 1) * SPRING_DT;
    const r = driver(t);
    // 根的加速度（有限差分）
    const ax = (r.x - 2 * c.prev.x + c.prev2.x) / (SPRING_DT * SPRING_DT);
    const ay = (r.y - 2 * c.prev.y + c.prev2.y) / (SPRING_DT * SPRING_DT);
    const ar = ((r.rot ?? 0) - 2 * (c.prev.rot ?? 0) + (c.prev2.rot ?? 0)) / (SPRING_DT * SPRING_DT);
    specs.forEach((sp, i) => {
      const s = c.st[i];
      // 外力：加速度投影到弹簧的敏感方向
      const f = -(ax * (sp.kx ?? 0) + ay * (sp.ky ?? 0) + ar * (sp.kr ?? 0)) * 1e-4;
      const acc = -sp.k * s.a - sp.damp * s.v + f + (sp.wind ? sp.wind(t) : 0);
      s.v += acc * SPRING_DT;
      s.a += s.v * SPRING_DT;
      s.a = clamp(s.a, -(sp.max ?? 1.2), sp.max ?? 1.2);
    });
    c.prev2 = c.prev; c.prev = r; c.step++;
  }
  return c.st.map((s) => s.a);
}

// 戳戳的标准次级骨骼：两只耳朵、铜铃、邮包、帽檐
const CHUO_SPRINGS = [
  { name: 'earL', k: 90, damp: 7, kx: 1.0, ky: 0.6, kr: 0.4, max: 0.9 },
  { name: 'earR', k: 80, damp: 6, kx: 1.0, ky: -0.5, kr: 0.4, max: 0.9 },
  { name: 'bell', k: 160, damp: 3.5, kx: 2.2, ky: 0, kr: 1, max: 1.1 },
  { name: 'bag', k: 220, damp: 14, kx: 0, ky: 1.4, kr: 0, max: 0.5 },
];

// 给一个“姿势函数”加上次级运动：pose(lt) 返回 drawChuo 的参数
function rigChuo(key, lt, pose, opts = {}) {
  const p = pose(lt);
  const drv = (t) => { const q = pose(t); return { x: (q.x ?? 0) * (q.flip ?? 1), y: (q.y ?? 0) + (q.lift ?? 0), rot: q.lean ?? 0 }; };
  const specs = opts.wind ? CHUO_SPRINGS.map((s) => ({ ...s, wind: opts.wind })) : CHUO_SPRINGS;
  const [eL, eR, bell, bag] = springs(key, lt, drv, specs);
  p.earSpring = [eL, eR];
  p.bellSwing = (p.bellHeld ? 0 : bell) + Math.sin(G.t * 3) * 0.04;
  p.bagJiggle = bag;
  return p;
}

// 团团：纸团的形变弹簧（落地挤压回弹）
function rigTuan(key, lt, pose) {
  const p = pose(lt);
  const drv = (t) => { const q = pose(t); return { x: q.x, y: q.y - (q.hop ?? 0), rot: 0 }; };
  const [sq] = springs(key, lt, drv, [{ k: 260, damp: 9, ky: 2.4, max: 0.45 }]);
  p.stretch = [1 + sq * 0.6, 1 - sq * 0.6];
  return p;
}
