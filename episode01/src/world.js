// 场景：风坡镇半坡街角（邮筒、路灯、垃圾桶）、对街矮墙、台阶下老爷爷的家
'use strict';

const GROUND = 900, LOW = 1020;
const X = {
  lamp: 170, cart: 330, mailbox: 520, can: 712, roadL: 1150, roadR: 1700,
  wallL: 1720, wallR: 2160, mug: 1990, stepsL: 2200, stepsR: 2440,
  pot: 2500, door: 2630, cane: 2742, window: 2900,
};
const WALL_TOP = 720;
function groundY(x) {
  if (x <= X.stepsL) return GROUND;
  if (x >= X.stepsR) return LOW;
  const k = Math.ceil((x - X.stepsL) / 60);
  return GROUND + k * 30;
}

// 相机：cam = {x, y, z}
function applyCam(ctx, cam) {
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
}

// ---------- 远景 ----------
function drawSky(ctx, cam, S) {
  ctx.save();
  ctx.setTransform(ctx.__base);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const sky = S.sky ?? ['#dfe3dc', '#efe6d4'];
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawFar(ctx, cam, S) {
  // 视差层：海、远山、屋顶
  ctx.save();
  const par = 0.3;
  ctx.setTransform(ctx.__base);
  ctx.translate(W / 2, H / 2);
  const z = 1 + (cam.z - 1) * 0.35;
  ctx.scale(z, z);
  ctx.translate(-cam.x * par - 300, -cam.y * 0.25 - 560);
  // 海
  ctx.fillStyle = S.sea ?? '#b9c6c6';
  ctx.fillRect(-2000, 520, 6000, 200);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const xx = -1500 + i * 210 + Math.sin(G.t * 0.4 + i) * 12, yy = 540 + (i % 5) * 18;
    ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 40, yy); ctx.stroke();
  }
  // 灯塔（远）
  ctx.fillStyle = '#d9d3c6';
  ctx.beginPath(); ctx.moveTo(1460, 528); ctx.lineTo(1470, 470); ctx.lineTo(1482, 470); ctx.lineTo(1492, 528); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9aa3a3'; ctx.fillRect(1466, 462, 20, 10);
  // 远山
  ctx.fillStyle = S.hill ?? '#aab3ae';
  ctx.beginPath(); ctx.moveTo(-2000, 540);
  for (let x = -2000; x <= 4000; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.004) * 40 + Math.sin(x * 0.011) * 18);
  ctx.lineTo(4000, 540); ctx.closePath(); ctx.fill();
  // 坡上的屋顶群
  const r = rng(9);
  for (let i = 0; i < 40; i++) {
    const x = -1600 + i * 140 + r() * 60, y = 600 + r() * 80, w = 90 + r() * 70, h = 50 + r() * 60;
    ctx.fillStyle = S.roofs ? S.roofs[i % S.roofs.length] : ['#cfc6b6', '#c6bfb2', '#d6cdbd'][i % 3];
    ctx.fillRect(x, y, w, h + 200);
    ctx.fillStyle = S.roofTop ?? '#9ea6a2';
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + w / 2, y - 26 - r() * 10); ctx.lineTo(x + w + 8, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(110,100,90,0.25)';
    ctx.fillRect(x + w * 0.25, y + 18, 12, 16); ctx.fillRect(x + w * 0.6, y + 18, 12, 16);
  }
  ctx.restore();
  // 空气透视雾
  ctx.save(); ctx.setTransform(ctx.__base);
  ctx.fillStyle = S.haze ?? 'rgba(240,234,222,0.35)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------- 建筑 ----------
function drawLeftBuilding(ctx) {
  // 邮筒那侧身后的老楼
  ctx.save();
  const x0 = -700, x1 = 1120, top = 260;
  ctx.fillStyle = PAL.plaster; ctx.fillRect(x0, top, x1 - x0, GROUND - top);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, GROUND - top); ctx.clip();
  mottle(ctx, x0, top, x1 - x0, GROUND - top, '#b9ab95', 60, 3, 70, 0.12);
  mottle(ctx, x0, top, x1 - x0, GROUND - top, '#f3ece0', 30, 4, 60, 0.18);
  // 墙裙石块
  ctx.fillStyle = PAL.stone; ctx.fillRect(x0, GROUND - 90, x1 - x0, 90);
  ctx.strokeStyle = 'rgba(107,84,64,0.35)'; ctx.lineWidth = 1.5;
  for (let row = 0; row < 3; row++) {
    const y = GROUND - 90 + row * 30;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (let x = x0 + (row % 2) * 40; x < x1; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.stroke(); }
  }
  ctx.restore();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(x1, top); ctx.lineTo(x1, GROUND); ctx.stroke();
  ctx.globalAlpha = 1;
  // 屋檐
  ctx.fillStyle = '#9b958b'; ctx.fillRect(x0, top - 26, x1 - x0 + 40, 30);
  // 窗户（带木百叶）
  for (const wx of [-260, 300, 820]) {
    const wy = 400;
    roundRectPath(ctx, wx, wy, 150, 190, 6); fillInk(ctx, '#8d9a9c', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(wx + 10, wy + 10, 60, 80);
    ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(wx + 75, wy); ctx.lineTo(wx + 75, wy + 190); ctx.moveTo(wx, wy + 95); ctx.lineTo(wx + 150, wy + 95); ctx.stroke();
    for (const sx of [wx - 60, wx + 150]) {
      roundRectPath(ctx, sx, wy - 6, 60, 202, 4); fillInk(ctx, '#93876f', 1.8);
      ctx.strokeStyle = 'rgba(80,60,40,0.35)'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(sx + 6, wy + 6 + k * 14); ctx.lineTo(sx + 54, wy + 6 + k * 14); ctx.stroke(); }
    }
    // 窗台花盆
    roundRectPath(ctx, wx + 20, wy + 190, 110, 12, 3); fillInk(ctx, '#b9ae9c', 1.6);
  }
  // 雨水管
  ctx.fillStyle = '#9a9a92'; ctx.fillRect(1060, top, 14, GROUND - top);
  ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 1.4; ctx.strokeRect(1060, top, 14, GROUND - top);
  ctx.restore();
}

function drawRightBuilding(ctx, S) {
  ctx.save();
  // 矮墙后面的楼
  const x0 = 1660, x1 = 2240, top = 300;
  ctx.fillStyle = '#d6cdbd'; ctx.fillRect(x0, top, x1 - x0, GROUND - top);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, GROUND - top); ctx.clip();
  mottle(ctx, x0, top, x1 - x0, GROUND - top, '#b6a993', 26, 13, 60, 0.12);
  ctx.restore();
  ctx.fillStyle = '#9b958b'; ctx.fillRect(x0 - 20, top - 24, x1 - x0 + 40, 28);
  // 楼门口
  roundRectPath(ctx, 1830, 560, 120, 230, 4); fillInk(ctx, '#7b8689', 2);
  roundRectPath(ctx, 1730, 410, 110, 120, 4); fillInk(ctx, '#8d9a9c', 2);
  roundRectPath(ctx, 2010, 410, 110, 120, 4); fillInk(ctx, '#8d9a9c', 2);
  // 台阶下老爷爷的房子
  const hx0 = 2240, hx1 = 3400, htop = 520;
  ctx.fillStyle = '#d3c7b3'; ctx.fillRect(hx0, htop, hx1 - hx0, LOW - htop);
  ctx.save(); ctx.beginPath(); ctx.rect(hx0, htop, hx1 - hx0, LOW - htop); ctx.clip();
  mottle(ctx, hx0, htop, hx1 - hx0, LOW - htop, '#b0a28a', 40, 17, 60, 0.14);
  ctx.fillStyle = PAL.stone; ctx.fillRect(hx0, LOW - 70, hx1 - hx0, 70);
  ctx.restore();
  // 瓦檐
  ctx.fillStyle = '#8e968f'; ctx.fillRect(hx0 - 30, htop - 30, hx1 - hx0 + 60, 34);
  ctx.strokeStyle = 'rgba(70,70,60,0.4)'; ctx.lineWidth = 2;
  for (let x = hx0 - 30; x < hx1 + 30; x += 24) { ctx.beginPath(); ctx.moveTo(x, htop - 30); ctx.lineTo(x, htop + 4); ctx.stroke(); }
  ctx.restore();
}

function drawRoad(ctx) {
  ctx.save();
  // 人行道 + 路面
  ctx.fillStyle = '#d4cbbb'; ctx.fillRect(-800, GROUND, X.roadL + 800, 700);
  ctx.fillStyle = PAL.road; ctx.fillRect(X.roadL, GROUND, X.roadR - X.roadL, 700);
  ctx.fillStyle = '#d0c7b7'; ctx.fillRect(X.roadR, GROUND, X.stepsL - X.roadR, 700);
  // 石板缝
  ctx.strokeStyle = 'rgba(107,84,64,0.22)'; ctx.lineWidth = 1.5;
  for (let x = -800; x < X.stepsL; x += 70) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x - 20, GROUND + 260); ctx.stroke(); }
  for (const y of [GROUND + 40, GROUND + 110]) { ctx.beginPath(); ctx.moveTo(-800, y); ctx.lineTo(X.stepsL, y); ctx.stroke(); }
  // 路沿
  ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-800, GROUND); ctx.lineTo(X.stepsL, GROUND); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(120,105,90,0.15)'; ctx.fillRect(X.roadL - 6, GROUND, 6, 260); ctx.fillRect(X.roadR, GROUND, 6, 260);
  // 台阶
  for (let k = 0; k < 4; k++) {
    const x = X.stepsL + k * 60, y = GROUND + k * 30;
    ctx.fillStyle = k % 2 ? '#c4baa8' : '#cbc1b0';
    ctx.fillRect(x, y, 2000, 30);
    ctx.fillStyle = '#b3a995'; ctx.fillRect(x, y + 30, 60, 700);
    ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y); ctx.lineTo(x + 60, y + 30); ctx.stroke();
  }
  ctx.fillStyle = '#cbc1b0'; ctx.fillRect(X.stepsR, LOW, 2000, 700);
  ctx.strokeStyle = PAL.inkSoft; ctx.beginPath(); ctx.moveTo(X.stepsR, LOW); ctx.lineTo(4000, LOW); ctx.stroke();
  // 积水（雨后）
  ctx.restore();
}

function drawPuddles(ctx, S) {
  ctx.save();
  for (const [x, w] of [[420, 120], [980, 160], [1420, 200]]) {
    ctx.fillStyle = S.puddle ?? 'rgba(170,185,195,0.45)';
    ellipsePath(ctx, x, GROUND + 60, w, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
    ellipsePath(ctx, x - w * 0.2, GROUND + 58, w * 0.3, 3); ctx.stroke();
  }
  ctx.restore();
}

// ---------- 道具 ----------
function drawLamp(ctx, S) {
  ctx.save();
  const x = X.lamp;
  ctx.fillStyle = '#5b5f5a';
  ctx.fillRect(x - 6, 380, 12, GROUND - 380);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.6; ctx.strokeRect(x - 6, 380, 12, GROUND - 380);
  roundRectPath(ctx, x - 14, GROUND - 40, 28, 40, 4); fillInk(ctx, '#5b5f5a', 1.6);
  // 灯头
  ctx.beginPath(); ctx.moveTo(x - 30, 380); ctx.lineTo(x + 30, 380); ctx.lineTo(x + 18, 330); ctx.lineTo(x - 18, 330); ctx.closePath();
  fillInk(ctx, S.lampOn ? '#f4e2b0' : '#c9c6bb', 2);
  ctx.beginPath(); ctx.moveTo(x - 26, 330); ctx.lineTo(x, 312); ctx.lineTo(x + 26, 330); ctx.closePath(); fillInk(ctx, '#5b5f5a', 1.8);
  if (S.lampOn) {
    const g = ctx.createRadialGradient(x, 360, 10, x, 360, 260);
    g.addColorStop(0, `rgba(255,236,190,${0.55 * S.lampOn})`); g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 260, 100, 520, 520);
    const g2 = ctx.createRadialGradient(x, GROUND, 10, x, GROUND, 200);
    g2.addColorStop(0, `rgba(255,236,190,${0.25 * S.lampOn})`); g2.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - 220, GROUND - 120, 440, 240);
  }
  ctx.restore();
}

// 旧邮筒：圆柱，绿漆斑驳。opts.chuoInSlot: 投信口里露出豆眼
function drawMailbox(ctx, S, opts = {}) {
  ctx.save();
  const x = X.mailbox, w = 150, top = GROUND - 330;
  // 底座
  roundRectPath(ctx, x - w / 2 - 12, GROUND - 40, w + 24, 40, 4);
  volFill(ctx, x, GROUND - 20, 100, PAL.mailboxLight, PAL.mailboxDark); inkStroke(ctx, 2.2);
  // 筒身
  ctx.beginPath();
  ctx.moveTo(x - w / 2, GROUND - 40); ctx.lineTo(x - w / 2, top + 40);
  ctx.lineTo(x + w / 2, top + 40); ctx.lineTo(x + w / 2, GROUND - 40); ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, PAL.mailboxDark); g.addColorStop(0.32, PAL.mailboxLight); g.addColorStop(0.55, PAL.mailbox); g.addColorStop(1, '#3d4c37');
  ctx.fillStyle = g; ctx.fill(); inkStroke(ctx, 2.4);
  ctx.save(); ctx.clip();
  mottle(ctx, x - w / 2, top, w, 330, PAL.rust, 24, 31, 14, 0.28);
  mottle(ctx, x - w / 2, top, w, 330, '#a6b39a', 14, 32, 10, 0.22);
  // 环箍
  ctx.fillStyle = 'rgba(40,50,35,0.35)';
  ctx.fillRect(x - w / 2, top + 150, w, 8); ctx.fillRect(x - w / 2, GROUND - 120, w, 8);
  ctx.restore();
  // 剥落处（露出旧底色）与两道粉笔身高刻痕
  ctx.save();
  wobblyPath(ctx, [[x - 60, GROUND - 106], [x - 36, GROUND - 110], [x - 22, GROUND - 98], [x - 26, GROUND - 76], [x - 48, GROUND - 72], [x - 62, GROUND - 88]], 77, 0.3);
  ctx.fillStyle = '#7e8a70'; ctx.fill();
  ctx.strokeStyle = 'rgba(60,70,50,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  const chalk = (x0, y0, len) => {
    ctx.strokeStyle = 'rgba(250,248,240,0.9)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + len, y0 + 1); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(250,248,240,0.6)';
    ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + 2); ctx.lineTo(x0 + len - 2, y0 + 3); ctx.stroke();
  };
  chalk(x - 56, GROUND - 98, 12); chalk(x - 40, GROUND - 84, 12);
  if (S.chalkGlow) {
    const gg = ctx.createRadialGradient(x - 36, GROUND - 92, 4, x - 36, GROUND - 92, 60);
    gg.addColorStop(0, `rgba(255,232,190,${0.35 * S.chalkGlow})`); gg.addColorStop(1, 'rgba(255,232,190,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - 100, GROUND - 160, 130, 130);
  }
  ctx.restore();
  // 顶盖（圆顶）
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 14, top + 44);
  ctx.bezierCurveTo(x - w / 2 - 14, top - 30, x + w / 2 + 14, top - 30, x + w / 2 + 14, top + 44);
  ctx.closePath();
  volFill(ctx, x - 20, top + 10, 110, PAL.mailboxLight, PAL.mailboxDark); inkStroke(ctx, 2.4);
  ctx.save(); ctx.clip(); mottle(ctx, x - 90, top - 30, 180, 80, PAL.rust, 10, 33, 12, 0.25); ctx.restore();
  roundRectPath(ctx, x - w / 2 - 8, top + 40, w + 16, 12, 3); fillInk(ctx, PAL.mailboxDark, 1.8);
  // 投信口（带帽檐）
  const sy = top + 80;
  roundRectPath(ctx, x - 50, sy, 100, 18, 4);
  ctx.fillStyle = '#1d1a16'; ctx.fill();
  if (opts.slotLight) {
    const gl = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    gl.addColorStop(0, 'rgba(255,220,160,0)'); gl.addColorStop(0.5, `rgba(255,220,160,${0.35 * opts.slotLight})`); gl.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = gl; ctx.fill();
  }
  inkStroke(ctx, 2);
  if (opts.eyes) {
    // 投信口里的一对豆眼
    const [lx] = opts.eyesLook ?? [0, 0];
    const ry = 5 * (opts.eyesOpen ?? 1);
    ctx.fillStyle = '#0a0806';
    ctx.fillStyle = '#2a211b';
    ctx.save(); ctx.beginPath(); ctx.rect(x - 50, sy, 100, 18); ctx.clip();
    ctx.fillStyle = 'rgba(242,229,203,0.25)'; ellipsePath(ctx, x + lx * 8, sy + 14, 26, 14); ctx.fill();
    ctx.fillStyle = '#fff6e6';
    for (const ex of [-8, 10]) {
      ellipsePath(ctx, x + ex + lx * 8, sy + 9, 3.6, Math.max(0.6, ry)); ctx.fillStyle = '#efe4cf'; ctx.fill();
      ellipsePath(ctx, x + ex + lx * 8, sy + 9, 2.4, Math.max(0.4, ry * 0.8)); ctx.fillStyle = '#2a211b'; ctx.fill();
    }
    if (opts.tuanDots) {
      ctx.fillStyle = 'rgba(243,235,220,0.55)'; ellipsePath(ctx, x + 32, sy + 16, 16, 9); ctx.fill();
      ctx.fillStyle = PAL.pencil;
      ellipsePath(ctx, x + 27, sy + 11, 1.6, 2.2); ctx.fill(); ellipsePath(ctx, x + 37, sy + 11, 1.6, 2.2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(x - 58, sy - 2); ctx.quadraticCurveTo(x, sy - 16, x + 58, sy - 2); ctx.lineTo(x + 54, sy + 2); ctx.lineTo(x - 54, sy + 2); ctx.closePath();
  fillInk(ctx, PAL.mailboxDark, 1.8);
  // 铭牌：信封图案
  roundRectPath(ctx, x - 26, top + 140, 52, 40, 4); fillInk(ctx, '#d8cfb6', 1.8);
  roundRectPath(ctx, x - 16, top + 150, 32, 20, 2); ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 16, top + 150); ctx.lineTo(x, top + 162); ctx.lineTo(x + 16, top + 150); ctx.stroke();
  // 取信小门
  roundRectPath(ctx, x - 34, top + 210, 68, 60, 4); ctx.strokeStyle = 'rgba(40,50,35,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  ellipsePath(ctx, x + 22, top + 240, 4, 4); fillInk(ctx, PAL.copper, 1.2);
  // 底部小草
  ctx.strokeStyle = '#8d9a6c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const gx of [x - 80, x - 72, x + 84, x + 90]) {
    ctx.beginPath(); ctx.moveTo(gx, GROUND); ctx.quadraticCurveTo(gx + 3, GROUND - 10, gx + 6 + Math.sin(G.t + gx) * 2, GROUND - 18); ctx.stroke();
  }
  ctx.restore();
}
const SLOT_Y = GROUND - 330 + 80;

function drawCan(ctx, S) {
  ctx.save();
  const x = X.can, w = 120, h = 150, top = GROUND - h;
  // 垃圾袋口（翻在桶沿外）
  const lidOpen = S.canLidOpen ?? 0;
  roundRectPath(ctx, x - w / 2, top, w, h, 6);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#8d918d'); g.addColorStop(0.35, '#c3c5bf'); g.addColorStop(1, '#7c807c');
  ctx.fillStyle = g; ctx.fill(); inkStroke(ctx, 2.2);
  ctx.strokeStyle = 'rgba(70,70,65,0.5)'; ctx.lineWidth = 2;
  for (const yy of [top + 40, top + 100]) { ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); ctx.stroke(); }
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 22, top + 6); ctx.lineTo(x + i * 22, GROUND - 4); ctx.strokeStyle = 'rgba(70,70,65,0.18)'; ctx.stroke(); }
  mottle(ctx, x - w / 2, top, w, h, '#8a7458', 8, 41, 8, 0.2);
  // 袋沿
  if (S.bagInCan !== false) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 4, top + 2); ctx.quadraticCurveTo(x - 30, top + 16, x, top + 8); ctx.quadraticCurveTo(x + 30, top + 18, x + w / 2 + 4, top + 2);
    ctx.lineTo(x + w / 2 + 2, top - 4); ctx.lineTo(x - w / 2 - 2, top - 4); ctx.closePath();
    fillInk(ctx, '#d9dbd6', 1.4);
  }
  // 盖子
  ctx.save();
  ctx.translate(x - w / 2 - 6, top - 4);
  ctx.rotate(-lidOpen * 1.9);
  if (lidOpen < 0.98) {
    ctx.beginPath(); ctx.ellipse(w / 2 + 6, 0, w / 2 + 8, 10, 0, Math.PI, TAU); ctx.closePath();
    fillInk(ctx, '#a3a7a1', 2);
    roundRectPath(ctx, w / 2 - 6, -18, 24, 8, 3); fillInk(ctx, '#7c807c', 1.4);
  }
  ctx.restore();
  ctx.restore();
}
const CAN_TOP = GROUND - 150;

function drawCart(ctx, x, y, S = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(S.dir ?? 1, 1);
  // 车斗
  ctx.beginPath(); ctx.moveTo(-90, -200); ctx.lineTo(80, -200); ctx.lineTo(70, -50); ctx.lineTo(-80, -50); ctx.closePath();
  volFill(ctx, -10, -140, 140, '#93a19c', '#6a7873'); inkStroke(ctx, 2.2);
  ctx.save(); ctx.clip(); mottle(ctx, -90, -200, 170, 150, '#5c6662', 14, 51, 12, 0.2); ctx.restore();
  ctx.fillStyle = 'rgba(230,232,225,0.4)'; ctx.fillRect(-84, -150, 160, 8);
  // 车里的垃圾袋
  if (S.bags) for (let i = 0; i < S.bags; i++) { ellipsePath(ctx, -40 + i * 46, -206, 30, 22); fillInk(ctx, '#d9dbd6', 1.6); }
  // 把手
  ctx.strokeStyle = '#5b5f5a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-86, -170); ctx.lineTo(-140, -230); ctx.stroke();
  // 轮
  const rot = S.wheelRot ?? 0;
  for (const wx of [-50, 40]) {
    ellipsePath(ctx, wx, -26, 26, 26); fillInk(ctx, '#4b4844', 2);
    ellipsePath(ctx, wx, -26, 9, 9); fillInk(ctx, '#9a958e', 1.4);
    ctx.strokeStyle = '#9a958e'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const a = rot + k * TAU / 3; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 9, -26 + Math.sin(a) * 9); ctx.lineTo(wx + Math.cos(a) * 22, -26 + Math.sin(a) * 22); ctx.stroke(); }
  }
  // 斜插着的扫帚
  if (S.broomInCart) drawBroom(ctx, 70, -90, -0.25, 1);
  ctx.restore();
}

// 竹扫帚：x,y 为扫帚头底端
function drawBroom(ctx, x, y, rot, s = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -300); ctx.stroke();
  ctx.strokeStyle = '#b79d6d'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -300); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -70); ctx.lineTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(6, -70); ctx.closePath();
  fillInk(ctx, '#c4ad7c', 1.8);
  ctx.strokeStyle = 'rgba(110,85,50,0.6)'; ctx.lineWidth = 1.2;
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 1.2, -66); ctx.lineTo(i * 6, 0); ctx.stroke(); }
  ctx.strokeStyle = PAL.rope; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-9, -52); ctx.lineTo(9, -52); ctx.stroke();
  ctx.restore();
}

// 搪瓷杯（带木盖、杯柄绳结）。x,y 为杯底中心
function drawMug(ctx, x, y, s = 1, opts = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.rotate(opts.rot ?? 0);
  // 杯柄
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(22, -22, 11, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = PAL.enamel; ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.arc(22, -22, 11, -1.2, 1.2); ctx.stroke();
  if (opts.knot !== false) drawKnot(ctx, 33, -22, 0.75);
  // 杯身
  ctx.beginPath(); ctx.moveTo(-22, -46); ctx.lineTo(22, -46); ctx.lineTo(20, -2); ctx.quadraticCurveTo(0, 2, -20, -2); ctx.closePath();
  volFill(ctx, -6, -28, 40, '#fbf8f1', '#d6d0c3'); inkStroke(ctx, 1.8);
  // 掉瓷
  ctx.fillStyle = '#5c5a55';
  ellipsePath(ctx, -12, -14, 3, 2.2); ctx.fill(); ellipsePath(ctx, 10, -30, 1.8, 1.4); ctx.fill();
  // 蓝灰杯口
  ellipsePath(ctx, 0, -46, 22, 5); fillInk(ctx, PAL.enamelRim, 1.4);
  // 木盖
  if (opts.lid !== false) {
    ellipsePath(ctx, 0, -50, 24, 6); fillInk(ctx, '#a7835c', 1.6);
    roundRectPath(ctx, -5, -60, 10, 8, 3); fillInk(ctx, PAL.woodDark, 1.2);
    if (opts.wrapper) {
      // 叠成小绳结的橙色糖纸
      ctx.save(); ctx.translate(-12, -56); ctx.rotate(-0.2);
      ctx.fillStyle = PAL.orange;
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(0, -5); ctx.lineTo(6, -2); ctx.lineTo(4, 3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b5612a'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-7, 8); ctx.moveTo(3, 3); ctx.lineTo(5, 8); ctx.strokeStyle = PAL.orange; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  if (opts.steam) drawSteam(ctx, 0, -58, G.t + (opts.steamOff ?? 0), 0.9, opts.steam);
  ctx.restore();
}

function drawLowWall(ctx, S) {
  ctx.save();
  const x0 = X.wallL, x1 = X.wallR, top = WALL_TOP;
  ctx.fillStyle = '#c9bfae'; ctx.fillRect(x0, top, x1 - x0, GROUND - top);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, GROUND - top); ctx.clip();
  const r = rng(61);
  ctx.strokeStyle = 'rgba(107,84,64,0.35)'; ctx.lineWidth = 1.6;
  for (let row = 0; top + 14 + row * 24 < GROUND; row++) {
    const y = top + 14 + row * 24;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    for (let x = x0 + r() * 30; x < x1; x += 40 + r() * 30) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 24); ctx.stroke(); }
  }
  mottle(ctx, x0, top, x1 - x0, GROUND - top, '#8f9a74', 10, 62, 10, 0.25);
  ctx.restore();
  roundRectPath(ctx, x0 - 8, top - 4, x1 - x0 + 16, 18, 3); fillInk(ctx, '#bdb2a0', 2);
  ctx.strokeStyle = PAL.ink; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.strokeRect(x0, top, x1 - x0, GROUND - top);
  ctx.restore();
}

function drawDoor(ctx, S) {
  ctx.save();
  const x = X.door, w = 140, h = 260, top = LOW - h;
  // 门框
  roundRectPath(ctx, x - w / 2 - 12, top - 14, w + 24, h + 14, 4); fillInk(ctx, '#8c7f6c', 2);
  // 门洞（开门时露出）
  ctx.fillStyle = '#3b332b'; ctx.fillRect(x - w / 2, top, w, h);
  const open = S.doorOpen ?? 0;
  // 门板：以左边为轴向内开，宽度变窄
  const dw = w * (1 - open * 0.75);
  if (S.doorInside && open > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2 + dw, top, w - dw, h); ctx.clip();
    S.doorInside(ctx); ctx.restore();
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(x - w / 2, top, dw, h);
  const g = ctx.createLinearGradient(x - w / 2, 0, x - w / 2 + dw, 0);
  g.addColorStop(0, PAL.woodLight); g.addColorStop(1, PAL.woodDark);
  ctx.fillStyle = g; ctx.fill(); inkStroke(ctx, 2.2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,50,35,0.45)'; ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) { const px = x - w / 2 + dw * i / 5; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, LOW); ctx.stroke(); }
  mottle(ctx, x - w / 2, top, dw, h, '#5e4a36', 20, 71, 10, 0.25);
  ctx.fillStyle = 'rgba(60,45,30,0.4)';
  ctx.fillRect(x - w / 2, top + 50, dw, 10); ctx.fillRect(x - w / 2, LOW - 70, dw, 10);
  ctx.restore();
  {
    const ex = x - w / 2 + dw; // 门板右缘
    if (open < 0.2) {
      // 门上的小信箱（带绳结）
      roundRectPath(ctx, x - 40, top + 90, 60, 34, 3); fillInk(ctx, '#7a6a55', 1.8);
      ctx.fillStyle = '#2b241d'; ctx.fillRect(x - 30, top + 98, 40, 5);
      drawKnot(ctx, x + 26, top + 108, 0.9);
    }
    const hx = ex - 26;
    // 门把手 + 绳结
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, LOW - 96); ctx.lineTo(hx, LOW - 70); ctx.stroke();
    ctx.strokeStyle = PAL.copper; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(hx, LOW - 96); ctx.lineTo(hx, LOW - 70); ctx.stroke();
    ellipsePath(ctx, hx, LOW - 98, 5, 5); fillInk(ctx, PAL.copper, 1.2);
    drawKnot(ctx, hx, LOW - 86, 1);
    if (S.letterInKnot) {
      const lk = S.letterInKnot;
      drawEnvelope(ctx, hx - 4 + (lk.dx ?? 0), LOW - 70 + (lk.dy ?? 0), 52, 34, 0.12 + (lk.rot ?? 0), { stamp: lk.stamp ?? 0 });
      drawKnot(ctx, hx, LOW - 86, 1);
    }
    if (S.doorExtra) S.doorExtra(ctx, hx);
  }
  // 门边挂着的盲杖
  ctx.save();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(X.cane, top + 70); ctx.lineTo(X.cane + 6, LOW - 20); ctx.stroke();
  ctx.strokeStyle = '#f2efe8'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(X.cane, top + 70); ctx.lineTo(X.cane + 6, LOW - 20); ctx.stroke();
  ctx.strokeStyle = '#a24d3e'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(X.cane + 5, LOW - 46); ctx.lineTo(X.cane + 6, LOW - 22); ctx.stroke();
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(X.cane - 8, top + 68, 9, -0.2, Math.PI + 0.3, true); ctx.stroke();
  drawKnot(ctx, X.cane + 2, top + 92, 0.85);
  ctx.restore();
  ctx.restore();
}

function drawPot(ctx, S) {
  ctx.save();
  const x = X.pot, y = LOW;
  // 植物
  ctx.strokeStyle = '#7d8a5e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    const sw = Math.sin(G.t * 1.5 + i) * (S.windy ? 6 : 2);
    ctx.beginPath(); ctx.moveTo(x + i * 4, y - 70); ctx.quadraticCurveTo(x + i * 14 + sw, y - 120, x + i * 20 + sw, y - 150 + Math.abs(i) * 10); ctx.stroke();
    ellipsePath(ctx, x + i * 20 + sw, y - 150 + Math.abs(i) * 10, 9, 5, i * 0.4); ctx.fillStyle = '#93a070'; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(x - 46, y - 80); ctx.lineTo(x + 46, y - 80); ctx.lineTo(x + 36, y); ctx.lineTo(x - 36, y); ctx.closePath();
  volFill(ctx, x - 10, y - 50, 70, '#c08d6a', '#93654a'); inkStroke(ctx, 2);
  roundRectPath(ctx, x - 50, y - 88, 100, 14, 3); fillInk(ctx, '#b07f5e', 1.8);
  ctx.restore();
}

// 老爷爷家的窗（铁栏 + 绳结）。S.windowOpen：窗扇打开；S.grandpaWin：窗内坐着的老爷爷
function drawWindow(ctx, S) {
  ctx.save();
  const x = X.window, w = 230, top = 680, bot = 900;
  roundRectPath(ctx, x - w / 2 - 14, top - 14, w + 28, bot - top + 28, 4); fillInk(ctx, '#8c7f6c', 2);
  // 窗内
  const gi = ctx.createLinearGradient(0, top, 0, bot);
  gi.addColorStop(0, '#6e675c'); gi.addColorStop(1, '#4f4941');
  ctx.fillStyle = gi; ctx.fillRect(x - w / 2, top, w, bot - top);
  if (S.grandpaWin) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, top, w, bot - top); ctx.clip();
    S.grandpaWin(ctx, x, bot);
    ctx.restore();
  }
  if (!S.windowOpen) {
    // 玻璃反光
    ctx.fillStyle = 'rgba(220,230,230,0.22)';
    ctx.beginPath(); ctx.moveTo(x - w / 2, top + 40); ctx.lineTo(x - w / 2 + 60, top); ctx.lineTo(x - w / 2 + 110, top); ctx.lineTo(x - w / 2, top + 110); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke();
  } else {
    // 打开的窗扇（向外）
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + k * w / 2, top); ctx.lineTo(x + k * (w / 2 + 50), top + 14); ctx.lineTo(x + k * (w / 2 + 50), bot - 14); ctx.lineTo(x + k * w / 2, bot); ctx.closePath();
      fillInk(ctx, '#9aa6a6', 2);
    }
  }
  // 铁栏
  ctx.strokeStyle = '#3f403d'; ctx.lineWidth = 5;
  for (let i = 1; i < 6; i++) { const bx = x - w / 2 + i * w / 6; ctx.beginPath(); ctx.moveTo(bx, top - 4); ctx.lineTo(bx, bot + 4); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x - w / 2, top + 30); ctx.lineTo(x + w / 2, top + 30); ctx.stroke();
  drawKnot(ctx, x - w / 2 + 2 * w / 6, top + 60, 0.95);
  drawKnot(ctx, x + w / 2 - w / 6, top + 120, 0.95);
  drawKnot(ctx, x - w / 2 + w / 6, bot - 34, 0.95);
  // 窗台
  roundRectPath(ctx, x - w / 2 - 26, bot, w + 52, 16, 3); fillInk(ctx, '#bdb2a0', 2);
  ctx.restore();
}

// ---------- 风 ----------
function drawWind(ctx, t, x0, y0, w, h, strength = 1) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.9 + i * 0.37) % 1;
    const yy = y0 + ((i * 97) % h);
    const xx = x0 + ph * w;
    const a = Math.sin(ph * Math.PI) * 0.6 * strength;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xx - 160, yy);
    ctx.bezierCurveTo(xx - 100, yy - 18, xx - 40, yy + 10, xx, yy - 6);
    if (i % 3 === 0) ctx.arc(xx + 4, yy - 20, 14, Math.PI / 2, Math.PI * 2.1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(150,160,165,${a * 0.4})`; ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- 整个街景 ----------
// S: 状态；S.actors: 在角色层绘制的函数列表（按顺序）；S.front: 前景
// 静态背景缓存：天空、远景、楼、路、路灯、矮墙只取决于镜头和光线预设。
// 软件光栅化下这部分最贵，镜头不动时直接复用上一帧的结果。
const BG_CACHE = { key: null, canvas: null };
function drawStaticLayer(ctx, cam, S) {
  ctx.__base = ctx.getTransform();
  drawSky(ctx, cam, S);
  drawFar(ctx, cam, S);
  ctx.save();
  applyCam(ctx, cam);
  drawLeftBuilding(ctx);
  drawRightBuilding(ctx, S);
  drawRoad(ctx);
  if (S.wet) drawPuddles(ctx, S);
  drawLamp(ctx, S);
  drawLowWall(ctx, S);
  ctx.restore();
}
function drawStreet(ctx, cam, S) {
  const base = ctx.getTransform();
  ctx.__base = base;
  const key = [cam.x, cam.y, cam.z, (S.sky || []).join(), S.sea, S.hill, S.haze, S.lampOn, S.wet, ctx.canvas.width].join('|');
  if (BG_CACHE.key !== key) {
    if (!BG_CACHE.canvas || BG_CACHE.canvas.width !== ctx.canvas.width) {
      BG_CACHE.canvas = document.createElement('canvas');
      BG_CACHE.canvas.width = ctx.canvas.width; BG_CACHE.canvas.height = ctx.canvas.height;
    }
    const bctx = BG_CACHE.canvas.getContext('2d');
    bctx.setTransform(base);
    drawStaticLayer(bctx, cam, S);
    BG_CACHE.key = key;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(BG_CACHE.canvas, 0, 0); ctx.restore();
  ctx.save();
  applyCam(ctx, cam);
  drawDoor(ctx, S);
  drawWindow(ctx, S);
  if (S.back) S.back(ctx);
  drawMailbox(ctx, S, S.mailboxOpts ?? {});
  drawPot(ctx, S);
  if (S.mug) drawMug(ctx, X.mug, WALL_TOP + 2, 1, S.mug);
  if (S.cart) drawCart(ctx, S.cart.x, S.cart.y ?? GROUND, S.cart);
  if (S.beforeCan) S.beforeCan(ctx);
  drawCan(ctx, S);
  if (S.actors) for (const a of S.actors) a(ctx);
  if (S.drips) {
    // 檐下滴水
    ctx.fillStyle = 'rgba(200,215,225,0.8)';
    for (let i = 0; i < 6; i++) {
      const ph = (G.t * 0.6 + i * 0.29) % 1;
      const dx = -200 + i * 240;
      ellipsePath(ctx, dx, 240 + ph * 650, 2, 4); ctx.fill();
    }
  }
  if (S.front) S.front(ctx);
  ctx.restore();
}
