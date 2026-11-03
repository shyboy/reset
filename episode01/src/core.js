// 基础工具：数学、随机、纸张质感、手绘线条
'use strict';

const W = 1920, H = 1080;

const PAL = {
  paper: '#f1e8d8',
  ink: '#6b5440',
  inkSoft: 'rgba(107,84,64,0.55)',
  body: '#f2e5cb',
  bodyShade: '#e0cca9',
  blush: 'rgba(226,150,140,0.45)',
  olive: '#7b8466',
  oliveDark: '#5f6a4f',
  oliveLight: '#959d7e',
  copper: '#9a6a3c',
  copperDark: '#6e4a2a',
  copperLight: '#c19461',
  stampMark: '#a65a48',     // 手上的旧印记：赭红，不是橙
  orange: '#e0813a',        // 本集主题色：橙（镜31之前不出现）
  orangeSoft: '#eba468',
  mailbox: '#5e7357',
  mailboxDark: '#46573f',
  mailboxLight: '#7a8d70',
  rust: '#8d6a4b',
  plaster: '#ddd3c3',
  plasterShade: '#cbbfab',
  stone: '#bdb3a3',
  stoneDark: '#a49a8a',
  road: '#c9c0b0',
  wood: '#8f7559',
  woodDark: '#6f5a44',
  woodLight: '#a88d6e',
  rope: '#b59c72',
  enamel: '#ece7dc',
  enamelRim: '#6f8090',
  uniform: '#8d969c',
  uniformDark: '#717a80',
  apron: '#a59c8c',
  skin: '#ecd2b8',
  skinShade: '#d9b99c',
  hairGray: '#9b958c',
  hairWhite: '#ece8e0',
  cardigan: '#b8a78b',
  cardiganDark: '#9c8b70',
  pencil: '#47423d',
  tuan: '#f3ebdc',
  tuanShade: '#ddd0bb',
};

// ---------- 数学 ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => { t = clamp(t); return 1 - (1 - t) * (1 - t) * (1 - t); };
const easeIn = (t) => { t = clamp(t); return t * t * t; };
const easeOutBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const sseg = (t, a, b) => smooth(seg(t, a, b));
const TAU = Math.PI * 2;
// 关键帧插值：keys = [[t, v], ...]
function keys(t, ks, ease = smooth) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i], [t1, v1] = ks[i + 1];
    if (t <= t1) {
      const u = ease((t - t0) / (t1 - t0));
      if (typeof v0 === 'number') return lerp(v0, v1, u);
      return v0.map((x, j) => lerp(x, v1[j], u));
    }
  }
  return ks[ks.length - 1][1];
}

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 平滑噪声（1D）
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const h = (n) => { const r = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453; return r - Math.floor(r); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// ---------- 全局帧状态 ----------
const G = { t: 0, boil: 0 };

// ---------- 手绘线条 ----------
// 沿着当前路径描边两次，制造铅笔/墨线的轻微不稳定感
function inkStroke(ctx, lw = 2.2, color = PAL.ink, alpha = 0.9) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.globalAlpha *= 0.35;
  ctx.lineWidth = lw * 0.6;
  ctx.translate(0.6, 0.5);
  ctx.stroke();
  ctx.restore();
}

// 抖动的闭合多边形（平滑），用于手绘物体的轮廓
function wobblyPath(ctx, pts, seed, amp = 1.2) {
  const r = rng(seed + G.boil * 7);
  const p = pts.map(([x, y]) => [x + (r() - 0.5) * amp, y + (r() - 0.5) * amp]);
  const n = p.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  ctx.closePath();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ellipsePath(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
}

// 带体积感的填充：从左上亮到右下暗
function volFill(ctx, cx, cy, r, light, dark) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.25);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fill();
}

function fillInk(ctx, fill, lw = 2.2, alpha = 0.9) {
  ctx.fillStyle = fill; ctx.fill();
  if (lw > 0) inkStroke(ctx, lw, PAL.ink, alpha);
}

// 斑驳纹理：在当前裁剪区域内撒一些半透明色斑
function mottle(ctx, x, y, w, h, color, n, seed, size = 18, alpha = 0.18) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + r());
    const px = x + r() * w, py = y + r() * h, s = size * (0.3 + r());
    ellipsePath(ctx, px, py, s, s * (0.5 + r() * 0.6), r() * 3);
    ctx.fill();
  }
  ctx.restore();
}

// 绳结（麻绳小结）
function drawKnot(ctx, x, y, s = 1, color = PAL.rope) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 3.4;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-7, -3); ctx.bezierCurveTo(-7, -11, 7, -11, 7, -3);
    ctx.bezierCurveTo(7, 4, -7, 4, -7, -3);
    ctx.moveTo(-2, 2); ctx.quadraticCurveTo(-4, 9, -7, 14);
    ctx.moveTo(2, 2); ctx.quadraticCurveTo(5, 9, 6, 15);
  };
  path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2.2; path(); ctx.stroke();
  ctx.fillStyle = color; ellipsePath(ctx, 0, 1, 4, 3.4); ctx.fill();
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

// 热气 / 白气
function drawSteam(ctx, x, y, t, s = 1, alpha = 0.6, n = 3) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.45 + i / n) % 1;
    const a = Math.sin(ph * Math.PI) * alpha;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    const bx = x + (i - (n - 1) / 2) * 9 * s;
    for (let k = 0; k <= 12; k++) {
      const yy = y - ph * 70 * s - k * 4 * s;
      const xx = bx + Math.sin(k * 0.5 + t * 2 + i * 2) * 5 * s;
      if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBreath(ctx, x, y, t, dir = 1, s = 1) {
  // 周期性呼出白气
  const ph = (t % 2.2) / 2.2;
  if (ph > 0.55) return;
  const u = ph / 0.55;
  ctx.save();
  ctx.globalAlpha = Math.sin(u * Math.PI) * 0.55;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    ellipsePath(ctx, x + dir * (10 + u * 40 + i * 10) * s, y - u * 12 * s - i * 3, (8 + u * 14 + i * 3) * s, (6 + u * 9) * s);
    ctx.fill();
  }
  ctx.restore();
}

// 动作线（好奇、惊吓）
function drawMarks(ctx, x, y, kind, t, s = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
  if (kind === '!') {
    const pop = easeOutBack(seg(t, 0, 0.25));
    ctx.scale(pop, pop);
    for (let i = -1; i <= 1; i++) {
      const a = -Math.PI / 2 + i * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.stroke();
    }
  } else if (kind === '?') {
    const pop = easeOutBack(seg(t, 0, 0.3));
    ctx.scale(pop, pop);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -12, 8, Math.PI * 1.1, Math.PI * 2.35);
    ctx.quadraticCurveTo(1, -2, 0, 3);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 10, 1.8, 0, TAU); ctx.fillStyle = PAL.ink; ctx.fill();
  } else if (kind === 'shake') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, 18, sx > 0 ? -0.6 : Math.PI - 0.6, sx > 0 ? 0.6 : Math.PI + 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 26, sx > 0 ? -0.5 : Math.PI - 0.5, sx > 0 ? 0.5 : Math.PI + 0.5);
      ctx.stroke();
    }
  } else if (kind === 'sweat') {
    ctx.fillStyle = 'rgba(170,200,215,0.9)';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(6, 2, 0, 6); ctx.quadraticCurveTo(-6, 2, 0, -8); ctx.fill();
    ctx.lineWidth = 1.2; ctx.stroke();
  } else if (kind === 'spark') {
    const pop = easeOutBack(seg(t, 0, 0.3));
    ctx.scale(pop, pop);
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- 纸张质感 ----------
let PAPER = null;
function buildPaper() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const r = rng(42);
  for (let i = 0; i < W * H; i++) {
    const v = 236 + (r() - 0.5) * 30;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v - 3; img.data[i * 4 + 2] = v - 9; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // 纤维
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, a = r() * TAU, l = 6 + r() * 26;
    g.strokeStyle = r() < 0.5 ? 'rgba(150,130,100,0.10)' : 'rgba(255,255,255,0.25)';
    g.lineWidth = 0.6 + r();
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l / 2, y + Math.sin(a + 0.4) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // 水彩晕染块
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, s = 60 + r() * 220;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    const dark = r() < 0.6;
    gr.addColorStop(0, dark ? 'rgba(170,150,120,0.07)' : 'rgba(255,255,250,0.10)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  PAPER = c;
}

function paperOverlay(ctx, strength = 1) {
  if (!PAPER) buildPaper();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.55 * strength;
  ctx.drawImage(PAPER, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function vignette(ctx, amount = 0.35, color = '40,30,20') {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.35, cw / 2, ch / 2, ch * 0.95);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

// 调色：在整帧上叠加色调
function grade(ctx, g) {
  if (!g) return;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (g.desat) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = g.desat;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, cw, ch);
  }
  if (g.mult) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = g.multA ?? 1;
    ctx.fillStyle = g.mult;
    ctx.fillRect(0, 0, cw, ch);
  }
  if (g.screen) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = g.screenA ?? 0.2;
    ctx.fillStyle = g.screen;
    ctx.fillRect(0, 0, cw, ch);
  }
  if (g.sideLight) {
    // 侧光：从画面一侧打进来的暖光
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = g.sideLight;
    const gr = ctx.createLinearGradient(g.sideDir > 0 ? 0 : cw, 0, g.sideDir > 0 ? cw : 0, ch * 0.4);
    gr.addColorStop(0, 'rgba(255,214,160,1)');
    gr.addColorStop(0.6, 'rgba(255,230,200,0.3)');
    gr.addColorStop(1, 'rgba(120,100,90,0.6)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.restore();
}

function blackout(ctx, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(a);
  ctx.fillStyle = '#120f0c';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
