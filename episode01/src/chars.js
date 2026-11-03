// 角色：戳戳、团团、环卫阿姨、老爷爷、序幕里的孩子
'use strict';

// ================= 戳戳 =================
// 本地坐标：脚底 (0,0)，头顶约 -100（不含帽子）。默认朝向画面右侧（3/4 侧），邮包在画面右侧。
function drawChuo(ctx, p) {
  const s = p.s ?? 1, flip = p.flip ?? 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha *= p.alpha ?? 1;
  // 地面阴影
  if (p.shadow !== false) {
    ctx.save();
    ctx.fillStyle = 'rgba(90,70,50,0.18)';
    ellipsePath(ctx, 0, 0, 50 * s * (p.bag === false ? 0.6 : 1), 7 * s);
    ctx.translate(flip * 12 * s, 0); ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, (p.lift ?? 0));
  ctx.scale(s * flip, s);
  ctx.rotate(p.lean ?? 0);
  const sq = p.sq ?? 1;
  ctx.scale(1 / Math.sqrt(sq), sq);

  const ph = p.walk;
  let footL = 0, footR = 0, bob = 0;
  if (ph != null) {
    footL = Math.max(0, Math.sin(ph)) * 7;
    footR = Math.max(0, -Math.sin(ph)) * 7;
    bob = -Math.abs(Math.sin(ph)) * 4;
  }
  ctx.translate(0, bob + (p.bob ?? 0));

  // 包（在身后的部分：信封、团团）
  const bagOn = p.bag !== false;
  if (bagOn) drawChuoBagBack(ctx, p);

  // 远侧手臂（邮包那侧）
  drawChuoArm(ctx, 20, -48, p.armL ?? 1.2, false, p);

  // 脚
  ctx.fillStyle = PAL.body;
  ellipsePath(ctx, -10, -4 - footL, 10, 6); fillInk(ctx, PAL.body, 2);
  ellipsePath(ctx, 11, -4 - footR, 10, 6); fillInk(ctx, PAL.body, 2);

  // 身体
  ctx.beginPath();
  ctx.moveTo(-19, -3);
  ctx.bezierCurveTo(-27, -22, -29, -50, -26, -68);
  ctx.bezierCurveTo(-25, -95, -12, -101, 0, -101);
  ctx.bezierCurveTo(13, -101, 26, -95, 27, -68);
  ctx.bezierCurveTo(30, -50, 28, -22, 20, -3);
  ctx.quadraticCurveTo(0, 2, -19, -3);
  ctx.closePath();
  volFill(ctx, -4, -60, 60, '#f8eed9', PAL.bodyShade);
  inkStroke(ctx, 2.3);
  // 肚子绒毛小笔触
  ctx.save();
  ctx.strokeStyle = 'rgba(160,130,95,0.35)'; ctx.lineWidth = 1;
  for (const [x, y] of [[-16, -30], [-12, -18], [15, -24], [18, -40]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 4); ctx.stroke();
  }
  ctx.restore();

  // 耳朵
  const es = p.ear ?? 0;
  const earDroop = p.earDroop ?? 0;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 21, -88);
    ctx.rotate(side * (0.62 + earDroop * -0.25) + es * (side > 0 ? 1 : 0.8) + (p.earSpring ? p.earSpring[side < 0 ? 0 : 1] : 0));
    ellipsePath(ctx, side * 2, 20 + earDroop * 4, 9.5, 20 + earDroop * 3);
    volFill(ctx, 0, 14, 20, '#f6ead3', PAL.bodyShade);
    inkStroke(ctx, 2.1);
    ctx.fillStyle = 'rgba(214,180,150,0.35)';
    ellipsePath(ctx, side * 2.5, 24, 4.5, 12); ctx.fill();
    ctx.restore();
  }

  // 脸
  drawChuoFace(ctx, p);

  // 帽子
  drawChuoCap(ctx, p);

  // 背带 + 包
  if (bagOn) {
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = PAL.oliveDark; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-25, -52); ctx.quadraticCurveTo(2, -44, 30, -30); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,50,40,0.6)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(-24, -54); ctx.quadraticCurveTo(2, -47, 30, -33); ctx.stroke();
    ctx.setLineDash([]);
    // 扣子
    ctx.save(); ctx.translate(-4, -45); ctx.rotate(0.4);
    ctx.strokeStyle = PAL.copper; ctx.lineWidth = 2.2;
    ctx.strokeRect(-5, -6, 10, 12);
    ctx.restore();
    ctx.restore();
    drawChuoBagFront(ctx, p);
  }

  // 近侧手臂（带邮戳印记的右手）
  drawChuoArm(ctx, -22, -50, p.armR ?? 1.9, true, p);

  if (p.extra) p.extra(ctx);
  ctx.restore();
}

function drawChuoFace(ctx, p) {
  const [lx, ly] = p.look ?? [0, 0];
  const ex = lx * 3.5, ey = ly * 2.5;
  const eyes = p.eyes ?? 'open';
  const blink = p.blink ?? 0;
  // 腮红
  ctx.fillStyle = PAL.blush;
  ellipsePath(ctx, -15 + ex * 0.5, -62, 5.5, 3.2); ctx.fill();
  ellipsePath(ctx, 19 + ex * 0.5, -62, 5.5, 3.2); ctx.fill();
  const E = [[-7 + ex, -73 + ey], [11 + ex, -73 + ey]];
  ctx.lineCap = 'round';
  for (const [x, y] of E) {
    if (eyes === 'happy') {
      ctx.strokeStyle = '#2a211b'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y + 2, 4.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (eyes === 'closed' || blink > 0.85) {
      ctx.strokeStyle = '#2a211b'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y - 1, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else if (eyes === 'squint') {
      ctx.strokeStyle = '#2a211b'; ctx.lineWidth = 2.2;
      const d = x < 2 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x - 4 * d, y - 3); ctx.lineTo(x + 3 * d, y); ctx.lineTo(x - 4 * d, y + 3); ctx.stroke();
    } else {
      const big = eyes === 'wide' ? 1.25 : 1;
      const ry = 5.4 * big * (1 - blink);
      ctx.fillStyle = '#2a211b';
      ellipsePath(ctx, x, y, 3.8 * big, Math.max(0.6, ry)); ctx.fill();
      if (ry > 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ellipsePath(ctx, x + 1.2, y - 2, 1.3, 1.5); ctx.fill();
      }
    }
  }
  if (p.mouth === 'o') {
    ctx.fillStyle = '#5a3d30';
    ellipsePath(ctx, 2 + ex, -63, 2.2, 2.8); ctx.fill();
  } else if (p.mouth === 'pant') {
    ctx.fillStyle = '#5a3d30';
    ellipsePath(ctx, 2 + ex, -63, 3, 2 + Math.abs(Math.sin(G.t * 14)) * 1.6); ctx.fill();
  } else if (p.mouth === 'smile') {
    ctx.strokeStyle = '#5a3d30'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(2 + ex, -66, 3, 0.3, Math.PI - 0.3); ctx.stroke();
  }
}

function drawChuoCap(ctx, p) {
  if (p.cap === false) return;
  const [cx, cy] = p.capOff ?? [0, 0];
  const spin = p.capSpin ?? 0; // 0..1 转一圈
  ctx.save();
  ctx.translate(cx, cy - 96);
  ctx.rotate(p.capTilt ?? 0.14);
  const c = Math.cos(spin * TAU), sn = Math.sin(spin * TAU);
  const brimX = 13 * c, brimFront = sn <= 0.35;
  const drawBrim = () => {
    ctx.save();
    ctx.translate(brimX, 4);
    ellipsePath(ctx, 0, 0, 20 * (0.55 + 0.45 * Math.abs(c)), 6.5, 0.08);
    fillInk(ctx, PAL.oliveDark, 1.9);
    ctx.restore();
  };
  if (!brimFront) drawBrim();
  // 帽身
  ctx.beginPath();
  ctx.moveTo(-26, 2);
  ctx.bezierCurveTo(-34, -6, -30, -20, -10, -21);
  ctx.bezierCurveTo(10, -24, 34, -18, 32, -6);
  ctx.bezierCurveTo(31, 0, 28, 2, 26, 3);
  ctx.closePath();
  volFill(ctx, -2, -12, 34, PAL.oliveLight, PAL.oliveDark);
  inkStroke(ctx, 2.1);
  // 布纹
  ctx.save(); ctx.clip();
  mottle(ctx, -34, -24, 66, 28, '#4f5942', 14, 11, 7, 0.22);
  ctx.restore();
  // 帽带
  ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(0, 6, 26, 3); ctx.lineTo(26, -3); ctx.quadraticCurveTo(0, 0, -26, -4); ctx.closePath();
  fillInk(ctx, PAL.oliveDark, 1.4);
  // 铜扣
  if (Math.abs(c) > 0.2 || true) {
    ctx.fillStyle = PAL.copperLight;
    for (const bx of [-22 * c + 4 * sn, 22 * c - 2 * sn]) {
      if (Math.abs(bx) < 27) { ellipsePath(ctx, bx, 0, 2.6, 2.6); fillInk(ctx, PAL.copperLight, 1); }
    }
  }
  // 信封徽章
  const bx = 2 + 10 * sn * -1 + 0 * c;
  if (Math.abs(bx) < 22) {
    ctx.save(); ctx.translate(bx * 0.5 + 3 * c, -12); ctx.rotate(-0.05);
    ctx.scale(Math.max(0.15, Math.abs(c) * 0.6 + 0.4), 1);
    roundRectPath(ctx, -7, -5, 14, 9, 1.5); fillInk(ctx, '#efe2c2', 1.1);
    ctx.beginPath(); ctx.moveTo(-6.5, -4.5); ctx.lineTo(0, 0.5); ctx.lineTo(6.5, -4.5);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
  }
  if (brimFront) drawBrim();
  ctx.restore();
}

function drawChuoArm(ctx, sx, sy, ang, near, p) {
  const len = (near ? p.armRLen : p.armLLen) ?? 20;
  const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 11.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = near ? '#f4e8d0' : '#e6d5b6'; ctx.lineWidth = 8.2;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  // 爪子
  const palm = near && p.palm;
  const pr = palm ? 8.5 : 5.6;
  ellipsePath(ctx, ex, ey, pr, pr * 1.05);
  fillInk(ctx, near ? '#f6ebd5' : '#e6d5b6', 1.8);
  if (palm) {
    // 手指
    for (let i = -1.5; i <= 1.5; i++) {
      const a = ang + i * 0.38;
      ellipsePath(ctx, ex + Math.cos(a) * 8, ey + Math.sin(a) * 8, 3.2, 3.2);
      fillInk(ctx, '#f6ebd5', 1.2);
    }
    drawPostmark(ctx, ex, ey, 4.6, p.stampColor ?? PAL.stampMark, 0.85);
  }
  ctx.restore();
}

// 圆形邮戳 + 三道波纹
function drawPostmark(ctx, x, y, r, color, alpha = 1, lw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw ?? r * 0.28; ctx.lineCap = 'round';
  ctx.setLineDash([r * 0.9, r * 0.32]);
  ctx.beginPath(); ctx.arc(0, 0, r, 0.4, TAU - 0.2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = (lw ?? r * 0.28) * 0.85;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const xx = -r * 0.3 + k * r * 0.17, yy = i * r * 0.38 + Math.sin(k * 1.1) * r * 0.09;
      if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnvelope(ctx, x, y, w, h, rot = 0, opts = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  roundRectPath(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.06);
  fillInk(ctx, opts.color ?? '#f3e9d4', opts.lw ?? 1.6);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h / 2 + 2); ctx.lineTo(0, h * 0.08); ctx.lineTo(w / 2 - 2, -h / 2 + 2);
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = Math.max(0.8, (opts.lw ?? 1.6) * 0.7); ctx.stroke();
  if (opts.candyShadow) {
    // 透光看到的糖的影子
    ctx.fillStyle = `rgba(110,90,70,${opts.candyShadow})`;
    ellipsePath(ctx, w * 0.12, h * 0.15, h * 0.16, h * 0.14); ctx.fill();
  }
  if (opts.stamp) {
    drawPostmark(ctx, -w * 0.22, h * 0.08, h * 0.28 * opts.stamp, PAL.orange, 0.95);
  }
  if (opts.light) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.7);
    g.addColorStop(0, `rgba(255,248,225,${opts.light})`);
    g.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = g;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
  }
  ctx.restore();
}

// 包内部（在包口后面露出的东西）
function drawChuoBagBack(ctx, p) {
  const bo = p.bagOffset ?? [0, 0];
  ctx.save();
  ctx.translate(bo[0], bo[1]);
  if (p.bagLetters !== 0) {
    drawEnvelope(ctx, 38, -60, 20, 14, -0.35);
    drawEnvelope(ctx, 58, -58, 18, 13, 0.3);
  }
  if (p.bigLetter) {
    const bl = p.bigLetter;
    drawEnvelope(ctx, 48 + (bl.dx ?? 0), -66 + (bl.dy ?? 0), 64, 42, bl.rot ?? -0.25, { candyShadow: 0 });
  }
  if (p.tuanInBag) {
    const tb = p.tuanInBag;
    drawTuan(ctx, { x: 50 + (tb.dx ?? 0), y: -44 + (tb.dy ?? 0), r: tb.r ?? 24, eyes: tb.eyes ?? 2, look: tb.look, seed: 7, squeeze: tb.squeeze ?? 0, tremble: tb.tremble ?? 0, shadow: false, blink: tb.blink });
  }
  ctx.restore();
}

function drawChuoBagFront(ctx, p) {
  const [bsx, bsy] = p.bagStretch ?? [1, 1];
  const bo = p.bagOffset ?? [0, 0];
  ctx.save();
  const jg = p.bagJiggle ?? 0;
  ctx.translate(46 + bo[0], -2 + bo[1]);
  ctx.scale(bsx * (1 + jg * 0.25), bsy * (1 - jg * 0.3));
  ctx.rotate(p.bagRot ?? 0);
  // 包身（相对包底中心）
  const pts = [[-28, -56], [-6, -60], [22, -56], [36, -34], [38, -10], [30, 0], [0, 3], [-28, 0], [-36, -12], [-34, -36]];
  wobblyPath(ctx, pts, 21, 0.6);
  volFill(ctx, -6, -30, 50, PAL.oliveLight, PAL.oliveDark);
  inkStroke(ctx, 2.2);
  ctx.save(); ctx.clip();
  mottle(ctx, -40, -62, 80, 66, '#4c5640', 26, 5, 9, 0.25);
  mottle(ctx, -40, -62, 80, 66, '#a7ae90', 12, 6, 7, 0.2);
  // 缝线
  ctx.strokeStyle = 'rgba(200,175,130,0.75)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(-30, -6); ctx.quadraticCurveTo(0, 0, 32, -6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // 翻盖
  ctx.beginPath();
  ctx.moveTo(-31, -52); ctx.quadraticCurveTo(-4, -62, 28, -53);
  ctx.quadraticCurveTo(34, -40, 30, -28);
  ctx.quadraticCurveTo(0, -20, -30, -30);
  ctx.quadraticCurveTo(-35, -42, -31, -52);
  ctx.closePath();
  volFill(ctx, -6, -48, 40, '#9aa283', PAL.olive);
  inkStroke(ctx, 2);
  ctx.save();
  ctx.strokeStyle = 'rgba(200,175,130,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(-26, -32); ctx.quadraticCurveTo(0, -25, 26, -31); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // 扣片 + 铜铃
  roundRectPath(ctx, -4, -32, 9, 9, 2); fillInk(ctx, PAL.copper, 1.4);
  const sw = p.bellSwing ?? Math.sin(G.t * 5) * 0.1;
  ctx.save(); ctx.translate(0.5, -24); ctx.rotate(sw);
  ctx.strokeStyle = PAL.copperDark; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 3); ctx.stroke();
  ellipsePath(ctx, 0, 9, 6.4, 6.4);
  volFill(ctx, 0, 9, 7, PAL.copperLight, PAL.copperDark); inkStroke(ctx, 1.4);
  ctx.strokeStyle = '#3e2a18'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(4, 10); ctx.moveTo(0, 10); ctx.lineTo(0, 14); ctx.stroke();
  ctx.restore();
  if (p.bellHeld) {
    // 用爪子按住铃铛
    ellipsePath(ctx, 1, -15, 7, 6.5); fillInk(ctx, '#f6ebd5', 1.8);
  }
  ctx.restore();
}

// ================= 团团 =================
const TUAN_GEO = {};
function tuanGeo(seed) {
  if (TUAN_GEO[seed]) return TUAN_GEO[seed];
  const r = rng(seed);
  const N = 22, outline = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    const rr = 1 + (r() - 0.5) * 0.14 + (i % 3 === 0 ? 0.04 : 0);
    outline.push([a, rr]);
  }
  const facets = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU, d = 0.2 + r() * 0.75;
    const cx = Math.cos(a) * d * 0.7, cy = Math.sin(a) * d * 0.7;
    const s = 0.18 + r() * 0.3, rot = r() * TAU;
    facets.push({ cx, cy, s, rot, k: r() < 0.55 ? -1 : 1, a: 0.06 + r() * 0.1 });
  }
  const creases = [];
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU, d = r() * 0.6;
    const x0 = Math.cos(a) * d, y0 = Math.sin(a) * d;
    const b = a + (r() - 0.5) * 1.6, l = 0.25 + r() * 0.45;
    const x1 = x0 + Math.cos(b) * l, y1 = y0 + Math.sin(b) * l;
    const b2 = b + (r() - 0.5) * 1.2, l2 = 0.1 + r() * 0.25;
    creases.push([x0, y0, x1, y1, x1 + Math.cos(b2) * l2, y1 + Math.sin(b2) * l2, r()]);
  }
  return (TUAN_GEO[seed] = { outline, facets, creases });
}

function drawTuan(ctx, p) {
  const seed = p.seed ?? 7;
  const geo = tuanGeo(seed);
  const sq = p.squeeze ?? 0;
  const R = (p.r ?? 45) * (1 - sq * 0.22);
  const tr = p.tremble ?? 0;
  const jx = tr ? (noise1(G.t * 40, 3) * 2.2 * tr) : 0;
  const jy = tr ? (noise1(G.t * 40, 9) * 1.6 * tr) : 0;
  ctx.save();
  ctx.globalAlpha *= p.alpha ?? 1;
  ctx.translate(p.x + jx, p.y + jy);
  if (p.shadow !== false) {
    ctx.save();
    const hop = p.hop ?? 0;
    ctx.fillStyle = `rgba(90,70,50,${0.18 * clamp(1 - hop / 120)})`;
    ellipsePath(ctx, 0, 0, R * 0.9, R * 0.16); ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, -(p.hop ?? 0) - R);
  const [ssx, ssy] = p.stretch ?? [1, 1];
  ctx.scale(ssx * (p.flip ?? 1), ssy);
  ctx.save();
  ctx.rotate(p.rot ?? 0);
  // 轮廓
  const pts = geo.outline.map(([a, rr]) => {
    const k = rr + (sq * ((Math.sin(a * 5) * 0.08)));
    return [Math.cos(a) * R * k, Math.sin(a) * R * k * 0.96];
  });
  wobblyPath(ctx, pts, seed, 0.8);
  const g = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.2);
  g.addColorStop(0, '#fbf6ea'); g.addColorStop(0.65, PAL.tuan); g.addColorStop(1, PAL.tuanShade);
  ctx.fillStyle = g; ctx.fill();
  inkStroke(ctx, 2.1, PAL.ink, 0.75);
  ctx.save();
  ctx.clip();
  // 折面明暗
  for (const f of geo.facets) {
    ctx.save();
    ctx.translate(f.cx * R, f.cy * R); ctx.rotate(f.rot);
    ctx.beginPath();
    ctx.moveTo(-f.s * R, 0); ctx.lineTo(f.s * R * 0.4, -f.s * R * 0.7); ctx.lineTo(f.s * R * 0.8, f.s * R * 0.3);
    ctx.closePath();
    ctx.fillStyle = f.k < 0 ? `rgba(150,125,95,${f.a * (1 + sq)})` : `rgba(255,255,250,${f.a * 1.6})`;
    ctx.fill();
    ctx.restore();
  }
  // 折痕
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const nC = Math.floor(geo.creases.length * (0.65 + sq * 0.35));
  for (let i = 0; i < nC; i++) {
    const c = geo.creases[i];
    ctx.strokeStyle = `rgba(120,95,70,${0.28 + c[6] * 0.25})`;
    ctx.lineWidth = 1 + c[6] * 0.8;
    ctx.beginPath(); ctx.moveTo(c[0] * R, c[1] * R); ctx.lineTo(c[2] * R, c[3] * R); ctx.lineTo(c[4] * R, c[5] * R); ctx.stroke();
  }
  // 底部暗部
  const g2 = ctx.createLinearGradient(0, -R, 0, R);
  g2.addColorStop(0.55, 'rgba(160,135,100,0)'); g2.addColorStop(1, 'rgba(150,125,95,0.22)');
  ctx.fillStyle = g2; ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
  ctx.restore();
  ctx.restore(); // rot

  // 展开的一角
  if (p.unfold) drawTuanCorner(ctx, R, p.unfold);

  // 眼睛（铅笔点）
  const eyes = p.eyes ?? 2;
  if (eyes > 0) {
    const [lx, ly] = p.look ?? [0, 0];
    const eo = p.eyeOpen ?? 1;
    const blink = p.blink ?? 0;
    const pos = [[-R * 0.2 + lx * R * 0.12, -R * 0.08 + ly * R * 0.08], [R * 0.2 + lx * R * 0.12, -R * 0.08 + ly * R * 0.08]];
    const show = eyes === 1 ? [pos[1]] : pos;
    for (const [ex, ey] of show) {
      // 褶缝阴影
      ctx.strokeStyle = 'rgba(120,95,70,0.35)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(ex, ey + R * 0.02, R * 0.14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      if (p.happy) {
        ctx.strokeStyle = PAL.pencil; ctx.lineWidth = Math.max(1.6, R * 0.05); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ex, ey + R * 0.04, R * 0.07, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else if (p.scared) {
        ctx.strokeStyle = PAL.pencil; ctx.lineWidth = Math.max(1.6, R * 0.045); ctx.lineCap = 'round';
        const d = ex < 0 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(ex - R * 0.06 * d, ey - R * 0.06); ctx.lineTo(ex + R * 0.05 * d, ey); ctx.lineTo(ex - R * 0.06 * d, ey + R * 0.06); ctx.stroke();
      } else {
        const ry = R * 0.085 * eo * (1 - blink);
        ctx.fillStyle = PAL.pencil;
        ellipsePath(ctx, ex, ey, R * 0.06 * Math.max(0.5, eo), Math.max(0.6, ry)); ctx.fill();
        // 铅笔颗粒
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ellipsePath(ctx, ex + R * 0.015, ey - ry * 0.4, R * 0.015, R * 0.02); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// 团团展开的一角：露出橙色蜡笔画的邮筒
function drawTuanCorner(ctx, R, u) {
  const k = easeOutBack(clamp(u));
  ctx.save();
  ctx.translate(R * 0.42, R * 0.38);
  ctx.rotate(-0.25);
  ctx.scale(0.3 + 0.7 * k, 0.3 + 0.7 * k);
  const w = R * 0.95, h = R * 0.8;
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, -h * 0.5); ctx.lineTo(w * 0.55, -h * 0.42); ctx.lineTo(w * 0.62, h * 0.38); ctx.lineTo(-w * 0.1, h * 0.55); ctx.lineTo(-w * 0.48, h * 0.05);
  ctx.closePath();
  ctx.fillStyle = '#f8f2e4'; ctx.fill();
  inkStroke(ctx, 1.6, PAL.ink, 0.6);
  ctx.save(); ctx.clip();
  // 平整纸面上几道轻折痕
  ctx.strokeStyle = 'rgba(150,125,95,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.1); ctx.lineTo(w * 0.6, h * 0.05); ctx.stroke();
  // 橙色蜡笔邮筒（粗糙线条）
  const cr = (x0, y0, x1, y1, lw) => {
    for (let j = 0; j < 3; j++) {
      ctx.strokeStyle = `rgba(224,129,58,${0.55 + j * 0.12})`; ctx.lineWidth = lw * (1 - j * 0.2);
      ctx.beginPath(); ctx.moveTo(x0 + j * 0.6, y0 - j * 0.4); ctx.lineTo(x1 + j * 0.5, y1 + j * 0.3); ctx.stroke();
    }
  };
  ctx.lineCap = 'round';
  const mx = w * 0.12, my = 0, mh = h * 0.6, mw = w * 0.26;
  cr(mx - mw / 2, my - mh * 0.25, mx - mw / 2, my + mh * 0.45, 2.6);
  cr(mx + mw / 2, my - mh * 0.25, mx + mw / 2, my + mh * 0.45, 2.6);
  cr(mx - mw / 2 - 3, my + mh * 0.45, mx + mw / 2 + 3, my + mh * 0.45, 2.6);
  ctx.strokeStyle = 'rgba(224,129,58,0.85)'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(mx, my - mh * 0.25, mw / 2, Math.PI, TAU); ctx.stroke();
  cr(mx - mw * 0.25, my - mh * 0.1, mx + mw * 0.25, my - mh * 0.1, 2.2);
  // 地面线条
  cr(-w * 0.3, my + mh * 0.5, w * 0.5, my + mh * 0.48, 1.6);
  ctx.restore();
  ctx.restore();
}

// ================= 人类：通用手臂 IK =================
function drawLimb(ctx, pts, w, fill, lw = 2) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = w + lw * 2; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}

function drawHumanHand(ctx, x, y, r, rot, color = PAL.skin, opts = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const curl = opts.curl ?? 0.4;
  // 手指
  for (let i = 0; i < 4; i++) {
    const fy = (i - 1.5) * r * 0.42;
    const fl = r * (0.95 - Math.abs(i - 1.2) * 0.12) * (1 - curl * 0.55);
    roundRectPath(ctx, r * 0.4, fy - r * 0.2, fl, r * 0.4, r * 0.2);
    fillInk(ctx, color, 1.3, 0.8);
  }
  ellipsePath(ctx, 0, 0, r * 0.75, r * 0.85);
  fillInk(ctx, color, 1.6, 0.85);
  // 拇指
  ctx.save(); ctx.translate(r * 0.2, -r * 0.7); ctx.rotate(-0.6 + curl * 0.4);
  roundRectPath(ctx, 0, -r * 0.2, r * 0.75, r * 0.42, r * 0.2); fillInk(ctx, color, 1.3, 0.8);
  ctx.restore();
  if (opts.old) {
    ctx.strokeStyle = 'rgba(140,100,70,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.2 + i * r * 0.25, r * 0.35, -0.6, 0.6); ctx.stroke(); }
  }
  ctx.restore();
}

// ================= 环卫阿姨 =================
// 本地坐标：脚底 (0,0)，身高约 330。dir=1 面向右。
function drawAuntie(ctx, p) {
  const s = p.s ?? 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha *= p.alpha ?? 1;
  ctx.fillStyle = 'rgba(80,65,50,0.18)';
  ellipsePath(ctx, 0, 0, 70 * s, 10 * s); ctx.fill();
  ctx.scale(s * (p.dir ?? 1), s);
  const ph = p.walk;
  let lA = 0, lB = 0, bob = 0;
  if (ph != null) { lA = Math.sin(ph) * 0.32; lB = -lA; bob = -Math.abs(Math.cos(ph)) * 5; }
  ctx.translate(0, bob);
  // 腿
  const hip = [0, -150];
  const leg = (ang, shade) => {
    const kx = hip[0] + Math.sin(ang) * 78, ky = hip[1] + Math.cos(ang) * 78;
    const fx = kx + Math.sin(ang * 0.4) * 72, fy = Math.min(-8, ky + Math.cos(ang * 0.4) * 72);
    drawLimb(ctx, [[hip[0], hip[1]], [kx, ky], [fx, fy]], 30, shade);
    roundRectPath(ctx, fx - 14, fy - 4, 38, 14, 6); fillInk(ctx, '#5b5048', 1.8);
  };
  leg(lB, PAL.uniformDark);
  leg(lA, '#7c858b');
  // 上身（可弯腰）
  ctx.save();
  ctx.translate(0, -150);
  ctx.rotate(p.bend ?? 0);
  ctx.translate(0, 150);
  // 远侧手臂
  const shB = [-20, -262], shF = [24, -260];
  const hB = p.handB ?? [-30, -150], hF = p.handF ?? [36, -150];
  const armB = ik2(shB[0], shB[1], hB[0], hB[1], 62, 60, -1);
  drawLimb(ctx, [shB, [armB[0], armB[1]], [armB[2], armB[3]]], 24, PAL.uniformDark);
  drawHumanHand(ctx, armB[2], armB[3], 11, p.handBRot ?? 1.4, PAL.skinShade);
  if (p.itemsBack) p.itemsBack(ctx);
  // 躯干
  ctx.beginPath();
  ctx.moveTo(-36, -268);
  ctx.bezierCurveTo(-48, -230, -50, -180, -44, -135);
  ctx.lineTo(44, -135);
  ctx.bezierCurveTo(50, -180, 46, -235, 36, -268);
  ctx.quadraticCurveTo(0, -280, -36, -268);
  ctx.closePath();
  volFill(ctx, -10, -220, 110, '#a0a8ad', PAL.uniformDark);
  inkStroke(ctx, 2.4);
  // 反光条（压成灰调）
  ctx.fillStyle = 'rgba(210,212,205,0.55)';
  ctx.fillRect(-46, -175, 92, 7);
  // 围裙
  ctx.beginPath();
  ctx.moveTo(-6, -246); ctx.lineTo(34, -246); ctx.lineTo(44, -128); ctx.lineTo(-18, -128); ctx.closePath();
  fillInk(ctx, PAL.apron, 2);
  // 围裙口袋
  roundRectPath(ctx, 4, -196, 34, 30, 4); fillInk(ctx, '#978e7e', 1.6);
  if (p.pocketLetter) {
    // 口袋里露出的信角
    const pl = p.pocketLetter;
    drawEnvelope(ctx, 20 + (pl.dx ?? 0), -198 + (pl.dy ?? 0), 34, 22, pl.rot ?? -0.2, { lw: 1.4 });
    roundRectPath(ctx, 4, -190, 34, 24, 4); fillInk(ctx, '#978e7e', 1.6);
  }
  // 领子 + 脖子
  ellipsePath(ctx, 4, -276, 18, 10); fillInk(ctx, PAL.skinShade, 1.8);
  // 头
  const ht = p.headTurn ?? 0;
  ctx.save();
  ctx.translate(4, -305);
  ctx.rotate(p.headTilt ?? 0);
  ctx.scale(1.18, 1.18);
  // 发髻
  ellipsePath(ctx, -26 - ht * 6, -2, 13, 13); fillInk(ctx, PAL.hairGray, 2);
  ellipsePath(ctx, 0, 0, 31, 33); volFill(ctx, -4, -6, 36, '#f2dcc5', PAL.skinShade); inkStroke(ctx, 2.3);
  // 帽子（软帽）
  ctx.beginPath();
  ctx.moveTo(-33, -4); ctx.bezierCurveTo(-36, -40, 34, -44, 34, -6);
  ctx.quadraticCurveTo(46 + ht * 6, -2, 48 + ht * 6, 2);
  ctx.quadraticCurveTo(10, -8, -33, -4);
  ctx.closePath();
  volFill(ctx, -4, -26, 40, '#b4afa5', '#8f8a80'); inkStroke(ctx, 2.1);
  // 脸
  const fx = ht * 10 + 6;
  ctx.fillStyle = '#3a2e26';
  if (p.eyesClosed) {
    ctx.strokeStyle = '#3a2e26'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fx - 6, 4, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx + 12, 4, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    ellipsePath(ctx, fx - 6, 4, 2.6, 3.4); ctx.fill();
    ellipsePath(ctx, fx + 12, 4, 2.6, 3.4); ctx.fill();
  }
  ctx.fillStyle = 'rgba(214,140,120,0.35)';
  ellipsePath(ctx, fx - 13, 14, 6, 3.5); ctx.fill();
  ellipsePath(ctx, fx + 20, 14, 6, 3.5); ctx.fill();
  ctx.strokeStyle = '#7a5a46'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(fx + 4, 8); ctx.lineTo(fx + 6, 13); ctx.stroke();
  if (p.mouth === 'smile') { ctx.beginPath(); ctx.arc(fx + 3, 17, 5, 0.3, Math.PI - 0.3); ctx.stroke(); }
  else if (p.mouth === 'o') { ctx.beginPath(); ellipsePath(ctx, fx + 3, 20, 2.4, 3); ctx.fillStyle = '#6a4636'; ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(fx - 1, 20); ctx.lineTo(fx + 7, 20); ctx.stroke(); }
  ctx.restore();
  // 呼白气
  if (p.breath) drawBreath(ctx, 40 + ht * 10, -290, G.t + (p.breathOff ?? 0), 1, 1.2);
  // 近侧手臂
  if (p.itemsMid) p.itemsMid(ctx);
  const armF = ik2(shF[0], shF[1], hF[0], hF[1], 62, 60, 1);
  drawLimb(ctx, [shF, [armF[0], armF[1]], [armF[2], armF[3]]], 25, '#949ca2');
  if (p.itemsFront) p.itemsFront(ctx);
  drawHumanHand(ctx, armF[2], armF[3], 12, p.handFRot ?? 1.4, PAL.skin);
  if (p.itemsTop) p.itemsTop(ctx);
  ctx.restore(); // bend
  ctx.restore();
}

// ================= 老爷爷 =================
// 本地坐标：脚底 (0,0)，身高约 320。seated=true 时只画到腰（坐姿，用于窗内）。
function drawGrandpa(ctx, p) {
  const s = p.s ?? 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s * (p.dir ?? 1), s);
  ctx.rotate(p.lean ?? 0);
  if (!p.seated) {
    const hip = [0, -150];
    for (const [k, shade] of [[-1, '#6f6658'], [1, '#7e7465']]) {
      drawLimb(ctx, [[hip[0] + k * 10, hip[1]], [k * 12, -75], [k * 12, -10]], 30, shade);
      roundRectPath(ctx, k * 12 - 14, -14, 38, 14, 6); fillInk(ctx, '#4f463f', 1.8);
    }
  }
  const shB = [-22, -258], shF = [24, -256];
  const hB = p.handB ?? [-30, -150], hF = p.handF ?? [36, -150];
  const armB = ik2(shB[0], shB[1], hB[0], hB[1], 60, 58, -1);
  drawLimb(ctx, [shB, [armB[0], armB[1]], [armB[2], armB[3]]], 24, PAL.cardiganDark);
  drawHumanHand(ctx, armB[2], armB[3], 11, p.handBRot ?? 1.4, PAL.skinShade, { old: true, curl: p.curlB ?? 0.4 });
  // 躯干（开衫）
  ctx.beginPath();
  ctx.moveTo(-36, -266);
  ctx.bezierCurveTo(-50, -230, -50, -180, -44, -140);
  ctx.lineTo(44, -140);
  ctx.bezierCurveTo(50, -180, 48, -235, 36, -266);
  ctx.quadraticCurveTo(0, -278, -36, -266);
  ctx.closePath();
  volFill(ctx, -10, -220, 110, '#c9b99d', PAL.cardiganDark); inkStroke(ctx, 2.4);
  // 衬衫领口 + 纽扣
  ctx.beginPath(); ctx.moveTo(-6, -268); ctx.lineTo(10, -232); ctx.lineTo(24, -268); ctx.closePath(); fillInk(ctx, '#e8e2d4', 1.6);
  ctx.fillStyle = PAL.woodDark;
  for (let i = 0; i < 4; i++) { ellipsePath(ctx, 12, -222 + i * 22, 2.4, 2.4); ctx.fill(); }
  ctx.strokeStyle = 'rgba(107,84,64,0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(8, -232); ctx.lineTo(6, -142); ctx.stroke();
  // 头
  ctx.save();
  ctx.translate(6, -302);
  ctx.rotate(p.headTilt ?? 0);
  ctx.scale(1.18, 1.18);
  const ht = p.headTurn ?? 0;
  ellipsePath(ctx, 0, 0, 31, 34); volFill(ctx, -4, -6, 36, '#f0d9c2', PAL.skinShade); inkStroke(ctx, 2.3);
  // 耳
  ellipsePath(ctx, -28 + ht * 4, 4, 6, 9); fillInk(ctx, PAL.skinShade, 1.6);
  // 白发（两侧 + 后脑）
  ctx.fillStyle = PAL.hairWhite;
  for (const [hx, hy, rx, ry] of [[-26, -8, 9, 14], [-18, -24, 12, 9], [-2, -32, 14, 6], [24 + ht * 4, -14, 6, 10]]) {
    ellipsePath(ctx, hx, hy, rx, ry); fillInk(ctx, PAL.hairWhite, 1.4, 0.6);
  }
  // 眉毛
  const fx = ht * 10 + 6;
  ctx.strokeStyle = '#d8d2c6'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx - 12, -6); ctx.lineTo(fx - 2, -8); ctx.moveTo(fx + 8, -8); ctx.lineTo(fx + 18, -6); ctx.stroke();
  // 闭着的眼睛
  ctx.strokeStyle = '#3a2e26'; ctx.lineWidth = 2;
  const smile = p.smile ?? 0;
  ctx.beginPath(); ctx.arc(fx - 6, 3 - smile, 4, 0.25 + smile * 0.1, Math.PI - 0.25); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx + 13, 3 - smile, 4, 0.25, Math.PI - 0.25 - smile * 0.1); ctx.stroke();
  // 皱纹
  ctx.strokeStyle = 'rgba(140,100,70,0.4)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(fx - 14, 0); ctx.lineTo(fx - 18, 3); ctx.moveTo(fx + 21, 0); ctx.lineTo(fx + 25, 3); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx + 3, -16, 10, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  // 鼻、嘴
  ctx.strokeStyle = '#7a5a46'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(fx + 4, 6); ctx.quadraticCurveTo(fx + 9, 13, fx + 4, 14); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fx - 3, 21); ctx.quadraticCurveTo(fx + 4, 21 + smile * 6, fx + 11, 21); ctx.stroke();
  ctx.fillStyle = `rgba(214,140,120,${0.2 + smile * 0.25})`;
  ellipsePath(ctx, fx - 13, 14, 6, 3.5); ctx.fill();
  ellipsePath(ctx, fx + 20, 14, 6, 3.5); ctx.fill();
  ctx.restore();
  if (p.itemsMid) p.itemsMid(ctx);
  const armF = ik2(shF[0], shF[1], hF[0], hF[1], 60, 58, 1);
  drawLimb(ctx, [shF, [armF[0], armF[1]], [armF[2], armF[3]]], 25, '#bfae92');
  drawHumanHand(ctx, armF[2], armF[3], 12, p.handFRot ?? 1.4, PAL.skin, { old: true, curl: p.curlF ?? 0.4 });
  if (p.itemsTop) p.itemsTop(ctx);
  ctx.restore();
}

// ================= 序幕里的孩子（永远不露脸） =================
function drawChild(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir ?? 1, 1);
  const ph = p.walk;
  let la = 0; if (ph != null) la = Math.sin(ph) * 0.45;
  // 行李箱（在身后）
  if (p.suitcase !== false) {
    const sx = -70;
    ctx.save();
    ctx.translate(sx, 0);
    roundRectPath(ctx, -38, -128, 76, 116, 10); fillInk(ctx, '#7f8b95', 2.2);
    ctx.strokeStyle = 'rgba(60,60,70,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -122); ctx.lineTo(-18, -18); ctx.moveTo(18, -122); ctx.lineTo(18, -18); ctx.stroke();
    // 拉杆
    ctx.strokeStyle = '#5e6268'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-10, -128); ctx.lineTo(-10, -175); ctx.lineTo(48, -175); ctx.stroke();
    // 轮子
    const wr = p.wheelRot ?? 0;
    for (const wx of [-24, 24]) {
      ellipsePath(ctx, wx, -6, 8, 8); fillInk(ctx, '#3f3c3a', 1.6);
      ctx.strokeStyle = '#8a8580'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(wx, -6); ctx.lineTo(wx + Math.cos(wr) * 6, -6 + Math.sin(wr) * 6); ctx.stroke();
    }
    ctx.restore();
  }
  // 腿
  for (const [k, a] of [[-1, -la], [1, la]]) {
    const hx = k * 10, hy = -140;
    const kx = hx + Math.sin(a) * 60, ky = hy + Math.cos(a) * 60;
    const fx = kx + Math.sin(a * 0.3) * 62, fy = Math.min(-8, ky + 62);
    drawLimb(ctx, [[hx, hy], [kx, ky], [fx, fy]], 18, '#ebd6bf');
    // 袜子
    drawLimb(ctx, [[fx, fy - 26], [fx, fy - 4]], 18, '#e8e2d6', 1.6);
    roundRectPath(ctx, fx - 12, fy - 6, 32, 14, 6); fillInk(ctx, '#6c7a86', 1.8);
  }
  // 短裤 + 外套
  roundRectPath(ctx, -26, -170, 52, 46, 8); fillInk(ctx, '#7c7468', 2);
  ctx.beginPath();
  ctx.moveTo(-30, -280); ctx.bezierCurveTo(-40, -240, -40, -190, -34, -150); ctx.lineTo(34, -150);
  ctx.bezierCurveTo(40, -190, 40, -240, 30, -280); ctx.closePath();
  volFill(ctx, -6, -220, 90, '#6d7f8c', '#4f5f6b'); inkStroke(ctx, 2.2);
  // 头（兜帽背影，不露脸）
  ellipsePath(ctx, 0, -310, 30, 32); fillInk(ctx, '#5c6d79', 2.2);
  // 手臂
  if (p.armTarget) {
    const a = ik2(18, -262, p.armTarget[0], p.armTarget[1], 52, 50, 1);
    drawLimb(ctx, [[18, -262], [a[0], a[1]], [a[2], a[3]]], 18, '#6d7f8c');
    if (p.handItem) p.handItem(ctx, a[2], a[3]);
    drawHumanHand(ctx, a[2], a[3], 8, p.handRot ?? -0.4, PAL.skin, { curl: p.curl ?? 0.4 });
  } else {
    drawLimb(ctx, [[18, -262], [24, -210], [28, -165]], 18, '#6d7f8c');
    drawHumanHand(ctx, 28, -160, 8, 1.5, PAL.skin);
  }
  ctx.restore();
}
