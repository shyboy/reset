// 分镜 1–4 段（镜 1–22）：序幕、醒来与热水杯、掉落的信、救出团团
'use strict';

// ---------- 调色预设（交给 GLSL 后期） ----------
const GR = {
  DAWN: { tint: [0.66, 0.76, 0.92], tintAmt: 0.55, sat: 0.42, contrast: 0.94, bright: 0.86, vig: 0.45, wobble: 1.4 },
  EARLY: { tint: [0.93, 0.95, 0.96], tintAmt: 0.3, sat: 0.7, contrast: 0.98, bright: 0.96, vig: 0.36 },
  DAY: { tint: [1.0, 0.96, 0.88], tintAmt: 0.22, sat: 0.82, contrast: 1.0, bright: 1.0, vig: 0.32 },
  DAY2: { tint: [1.0, 0.9, 0.76], tintAmt: 0.3, sat: 0.92, contrast: 1.03, bright: 1.05, side: [1, 0.45], vig: 0.3, glow: 0.35 },
};
function mixGrade(a, b, u) {
  const o = { ...b };
  for (const k of ['tintAmt', 'sat', 'contrast', 'bright', 'vig']) o[k] = lerp(a[k] ?? 1, b[k] ?? 1, u);
  o.tint = a.tint.map((v, i) => lerp(v, b.tint[i], u));
  return o;
}

// ---------- 场景预设 ----------
const SKY = {
  DAWN: { sky: ['#7d8a9b', '#bfc5c7'], sea: '#8f9ea6', hill: '#7f8a8f', haze: 'rgba(160,172,185,0.35)', roofTop: '#6f7a80', roofs: ['#a5a9aa', '#9fa3a5', '#a9abab'], lampOn: 1, wet: true, puddle: 'rgba(150,165,180,0.5)', canLidOpen: 0.35 },
  DAY: { sky: ['#dfe3dc', '#f0e7d6'], canLidOpen: 0.35 },
  DAY2: { sky: ['#f2dcbd', '#f6ead6'], sea: '#c3cdc8', hill: '#b6b8a8', haze: 'rgba(250,236,214,0.3)', roofTop: '#a79f92', canLidOpen: 0 },
};
const street = (ctx, cam, S) => drawStreet(ctx, cam, S);

// ---------- 小工具 ----------
const blinkAt = (t, off = 0) => { const ph = (t + off) % 3.3; return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0; };
const camK = (t, ks) => { const v = keys(t, ks.map(([tt, c]) => [tt, [c.x, c.y, c.z]])); return { x: v[0], y: v[1], z: v[2] }; };
const LETTER_X = 1812;
// 人物本地坐标（考虑朝向、弯腰）
function toLocal(ax, dir, wx, wy) { return [(wx - ax) * dir, wy - GROUND]; }
function unbend(pt, bend) {
  const c = Math.cos(-bend), s = Math.sin(-bend), x = pt[0], y = pt[1] + 150;
  return [x * c - y * s, x * s + y * c - 150];
}
// 粒子发射器：世界坐标 -> 屏幕坐标
function emit(type, cam, wx, wy, t, o = {}) {
  const [x, y] = toScreen(cam, wx, wy);
  return { type, x, y, t, scale: (o.scaleMul ?? 1) * cam.z, ...o };
}
function emitScreen(type, x, y, t, o = {}) { return { type, x, y, t, ...o }; }

// 拿在人物手里的搪瓷杯（本地坐标，手的位置）
const mugInHand = (h, o = {}) => (c) => drawMug(c, h[0] - 6, h[1] + 26, 1, { steam: 0, ...o });

// 垃圾袋露出桶沿的部分。up: 0..1 被提起的高度；neck: 0..1 袋口收紧
function drawSack(ctx, up, neck, clipBelow = true) {
  ctx.save();
  if (clipBelow) { ctx.beginPath(); ctx.rect(X.can - 200, 0, 400, CAN_TOP + 4); ctx.clip(); }
  const x = X.can, top = CAN_TOP - 18 - up * 50, tw = lerp(112, 14, neck);
  ctx.beginPath();
  ctx.moveTo(x - 64, CAN_TOP + 6);
  ctx.bezierCurveTo(x - 66, CAN_TOP - 20, x - tw / 2 - 6, top + 26, x - tw / 2, top + 6);
  ctx.quadraticCurveTo(x, top - 6 - neck * 4, x + tw / 2, top + 6);
  ctx.bezierCurveTo(x + tw / 2 + 6, top + 26, x + 66, CAN_TOP - 20, x + 64, CAN_TOP + 6);
  ctx.closePath();
  volFill(ctx, x - 20, top + 30, 90, '#eef0ec', '#bfc3be'); inkStroke(ctx, 1.8);
  ctx.strokeStyle = 'rgba(120,125,120,0.4)'; ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 22, CAN_TOP); ctx.quadraticCurveTo(x + i * 10, top + 30, x + i * tw * 0.15, top + 8); ctx.stroke(); }
  if (neck > 0.85) {
    // 扎好的结
    ellipsePath(ctx, x, top - 4, 10, 7); fillInk(ctx, '#e3e5e1', 1.4);
    ctx.beginPath(); ctx.moveTo(x - 4, top - 8); ctx.quadraticCurveTo(x - 16, top - 24, x - 8, top - 30); ctx.moveTo(x + 4, top - 8); ctx.quadraticCurveTo(x + 18, top - 22, x + 12, top - 30);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}
// 扎好提走的垃圾袋（独立物体，x,y 为结的位置）
function drawTiedSack(ctx, x, y, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(-6, 4); ctx.bezierCurveTo(-60, 30, -64, 110, -10, 120); ctx.lineTo(10, 120); ctx.bezierCurveTo(64, 110, 60, 30, 6, 4); ctx.closePath();
  volFill(ctx, -10, 60, 80, '#eef0ec', '#bfc3be'); inkStroke(ctx, 1.8);
  ellipsePath(ctx, 0, 0, 9, 6); fillInk(ctx, '#e3e5e1', 1.4);
  ctx.restore();
}

// 戳戳手里举着的大信（本地坐标）
const heldLetter = (x, y, rot, o = {}) => (c) => drawEnvelope(c, x, y, 70, 46, rot, o);

// ================= 分镜 =================
const SHOTS_A = [
  // ---------- 1 序幕 ----------
  { // 镜1 全景：雨后的半坡街角
    title: '雨后街角', d: 4, grade: GR.DAWN,
    sfx: [[0, 'drips', 0.7, { dur: 15 }], [0, 'coldwind', 0.5, { dur: 15 }]],
    draw(ctx, lt) {
      const cam = { x: 560, y: 650, z: lerp(0.94, 1.0, lt / 4) };
      street(ctx, cam, { ...SKY.DAWN, drips: true });
      return { fx: [
        emitScreen('drip', ...toScreen(cam, 200, 262), lt, { spread: [1800 * cam.z, 0], scale: cam.z }),
        emitScreen('mist', 960, 700, lt + 3, { spread: [2200, 400] }),
      ] };
    },
  },
  { // 镜2 低机位：小鞋和行李箱轮子停在邮筒前；小手举着纸伸向投信口
    title: '小鞋与行李箱', d: 4, grade: GR.DAWN,
    sfx: [[0.1, 'wheels', 0.8, { dur: 1.7 }], [0.1, 'footsteps', 0.4, { dur: 1.7 }], [1.8, 'wheelstop', 0.6]],
    draw(ctx, lt) {
      if (lt < 2.0) {
        const cam = { x: 340, y: 880, z: 3.0 };
        const cx = lerp(40, 360, easeOut(seg(lt, 0, 1.8)));
        street(ctx, cam, { ...SKY.DAWN, actors: [(c) => {
          c.save(); c.beginPath(); c.rect(-1000, 705, 3000, 1000); c.clip();
          c.translate(cx, GROUND); c.scale(0.75, 0.75);
          drawChild(c, { x: 0, y: 0, dir: 1, walk: lt < 1.8 ? lt * 9 : null, wheelRot: cx / 8 });
          c.restore();
        }] });
        return { fx: [emitScreen('drip', ...toScreen(cam, 340, 262), lt, { spread: [800, 0], scale: cam.z })] };
      }
      const cam = { x: 540, y: SLOT_Y + 40, z: 3.2 };
      const u = easeOut(seg(lt, 2.1, 3.1));
      const hx = lerp(430, 472, u), hy = lerp(SLOT_Y + 230, SLOT_Y + 24, u) + Math.sin(lt * 9) * 1.2 * seg(lt, 3.1, 3.3);
      street(ctx, cam, { ...SKY.DAWN, front: (c) => {
        drawLimb(c, [[300, SLOT_Y + 300], [hx - 50, hy + 60], [hx, hy]], 18, '#6d7f8c');
        // 折好的纸
        c.save(); c.translate(hx + 20, hy - 10); c.rotate(-0.15);
        roundRectPath(c, -22, -15, 44, 30, 2); fillInk(c, '#f6f0e2', 1.5);
        c.strokeStyle = 'rgba(120,100,80,0.4)'; c.beginPath(); c.moveTo(0, -15); c.lineTo(0, 15); c.stroke();
        c.restore();
        drawHumanHand(c, hx, hy, 9, -0.5, PAL.skin, { curl: 0.55 });
      } });
      return {};
    },
  },
  { // 镜3 特写：小手慢慢攥紧，纸被揉成一团
    title: '揉皱', d: 3, grade: GR.DAWN, shake: (lt) => (lt > 0.5 && lt < 1.8 ? 0.15 : 0),
    sfx: [[0.5, 'crumple', 1.0]],
    draw(ctx, lt) {
      // 背景：虚化的邮筒
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#3e4c38'); g.addColorStop(0.4, '#61725a'); g.addColorStop(1, '#34402f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#16130f'; roundRectPath(ctx, 520, 90, 880, 60, 20); ctx.fill();
      mottle(ctx, 0, 0, W, H, PAL.rust, 30, 88, 80, 0.15);
      const u = smooth(seg(lt, 0.4, 2.2));
      const cx = 960, cy = 560;
      // 袖子 + 手掌
      drawLimb(ctx, [[600, 1250], [cx - 120, cy + 300]], 200, '#6d7f8c', 4);
      ellipsePath(ctx, cx - 40, cy + 170, 190, 160); fillInk(ctx, PAL.skin, 4);
      // 纸：从平整的长方形变成皱团
      const rr = rng(5), N = 18, pts = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU;
        const rect = (() => { const c = Math.cos(a), s = Math.sin(a); const k = Math.min(260 / Math.abs(c || 1e-6), 180 / Math.abs(s || 1e-6)); return [c * k, s * k]; })();
        const ball = 150 * (1 + (rr() - 0.5) * 0.3);
        pts.push([cx + lerp(rect[0], Math.cos(a) * ball, u), cy + lerp(rect[1], Math.sin(a) * ball * 0.95, u)]);
      }
      wobblyPath(ctx, pts, 3, 2 + u * 6);
      volFill(ctx, cx - 40, cy - 40, 260, '#fbf7ee', PAL.tuanShade); inkStroke(ctx, 3.2, PAL.ink, 0.8);
      ctx.save(); ctx.clip();
      const rc = rng(17);
      for (let i = 0; i < 26 * u; i++) {
        const x0 = cx + (rc() - 0.5) * 300, y0 = cy + (rc() - 0.5) * 260;
        ctx.strokeStyle = `rgba(120,95,70,${0.25 + rc() * 0.3})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (rc() - 0.5) * 140, y0 + (rc() - 0.5) * 140); ctx.lineTo(x0 + (rc() - 0.5) * 200, y0 + (rc() - 0.5) * 120); ctx.stroke();
        ctx.fillStyle = rc() < 0.5 ? 'rgba(150,125,95,0.12)' : 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (rc() - 0.5) * 160, y0 + (rc() - 0.5) * 160); ctx.lineTo(x0 + (rc() - 0.5) * 160, y0 + (rc() - 0.5) * 160); ctx.fill();
      }
      // 纸上隐约的蜡笔痕（还看不清是什么）
      ctx.globalAlpha = 0.25 * (1 - u);
      ctx.strokeStyle = '#9fb3bf'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(cx - 200, cy + 60); ctx.bezierCurveTo(cx - 80, cy - 20, cx + 60, cy + 90, cx + 200, cy + 20); ctx.stroke();
      ctx.restore();
      // 手指收拢
      for (let i = 0; i < 4; i++) {
        const fx = cx + 80 + i * 20 - u * 120, fy = cy - 120 + i * 90;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.PI + 0.2 - u * 0.5);
        roundRectPath(ctx, -10, -32, lerp(40, 190, u), 64, 32); fillInk(ctx, PAL.skin, 3.4);
        ctx.restore();
      }
      ctx.save(); ctx.translate(cx - 230, cy + 40); ctx.rotate(-1.0 + u * 0.6);
      roundRectPath(ctx, 0, -34, 200, 68, 34); fillInk(ctx, PAL.skin, 3.4);
      ctx.restore();
      return { grade: { dof: [0.12, 0.2, 6] } };
    },
  },
  { // 镜4 中景：纸团落进垃圾桶，小鞋转身跑远；投信口一片漆黑
    title: '纸团落下', d: 4, grade: GR.DAWN,
    sfx: [[0.85, 'paperdrop', 0.7], [1.2, 'footsteps', 0.7, { dur: 1.5 }], [1.2, 'wheels', 0.6, { dur: 1.5 }], [1.6, 'horn', 0.35]],
    draw(ctx, lt) {
      const cam = camK(lt, [[0, { x: 620, y: 866, z: 3.2 }], [2.7, { x: 620, y: 866, z: 3.2 }], [3.9, { x: 530, y: SLOT_Y + 20, z: 2.8 }]]);
      const fall = seg(lt, 0.15, 0.95);
      const bx = lerp(470, X.can - 4, fall), by = lerp(SLOT_Y + 20, CAN_TOP + 46, easeIn(fall));
      const run = seg(lt, 1.1, 2.8);
      const cx = lerp(380, -260, run);
      street(ctx, cam, { ...SKY.DAWN,
        beforeCan: (c) => { if (lt > 0.15) drawTuan(c, { x: bx, y: by, r: 32, eyes: 0, rot: fall * 4, shadow: false, squeeze: 0.6 }); },
        actors: [(c) => {
          if (cx < -200) return;
          c.save(); c.beginPath(); c.rect(-1000, 694, 3000, 1000); c.clip();
          c.translate(cx, GROUND); c.scale(0.75, 0.75);
          drawChild(c, { x: 0, y: 0, dir: lt > 1.0 ? -1 : 1, walk: lt > 1.1 ? lt * 16 : null, wheelRot: -cx / 8 });
          c.restore();
        }],
      });
      return { fx: [emitScreen('mist', 960, 700, lt + 9, { spread: [2200, 400] })] };
    },
  },

  // ---------- 2 醒来与热水杯 ----------
  { // 镜5 特写：晨光照进投信口，两只豆眼亮起
    title: '豆眼', d: 5, grade: (lt) => ({ ...mixGrade(GR.DAWN, GR.EARLY, sseg(lt, 0, 4)), rays: [0.85, 0.0, 0.35 * sseg(lt, 1, 3)] }),
    sfx: [[1.0, 'inhale', 0.5], [2.1, 'tick', 0.15], [3.3, 'tick', 0.15]],
    draw(ctx, lt) {
      const cam = { x: 520, y: SLOT_Y + 9, z: lerp(5.2, 5.6, lt / 5) };
      const open = sseg(lt, 0.8, 1.3) * (1 - blinkAt(lt, 1.2));
      street(ctx, cam, { ...SKY.DAY, mailboxOpts: {
        slotLight: sseg(lt, 0, 2), eyes: lt > 0.8, eyesOpen: open,
        eyesLook: keys(lt, [[1.6, [0, 0]], [2.0, [-1, 0]], [2.9, [-1, 0]], [3.3, [1, 0]], [4.1, [1, 0]], [4.5, [0, 0]]]),
      } });
      return { fx: [emitScreen('dust', 1300, 300, lt, { spread: [900, 500], alpha: sseg(lt, 1, 3) })] };
    },
  },
  { // 镜6 中景：戳戳从投信口挤出来，大包卡住，“噗”地掉在地上，扶正帽子
    title: '挤出投信口', d: 5, grade: GR.EARLY,
    sfx: [[0.3, 'squeeze', 0.6], [1.1, 'tug', 0.6, { dur: 1.3 }], [2.4, 'pop', 0.7], [2.95, 'thud', 0.8], [2.95, 'bell', 0.9], [3.8, 'rustle', 0.3]],
    shake: (lt) => (lt > 2.95 && lt < 3.15 ? 0.6 : 0),
    draw(ctx, lt) {
      const cam = { x: 560, y: 760, z: 2.2 };
      const lip = SLOT_Y + 18;
      const pose = (t) => {
        if (t < 1.0) {
          const e = easeOut(seg(t, 0.2, 1.0));
          return { x: 520, y: lip + lerp(80, 36, e), sq: 1.2, look: keys(t, [[0.6, [0, 0]], [0.8, [-0.8, 0]], [1, [0.8, 0]]]), capTilt: 0.3 };
        }
        if (t < 2.4) {
          const e = easeOut(seg(t, 1.0, 1.4));
          return { x: 520, y: lerp(lip + 36, lip, e), sq: lerp(1.2, 1.0, e), lean: -0.2 + Math.sin(t * 15) * 0.09, bagOffset: [0, 70], bagStretch: [0.8, 1.5], eyes: 'squint', armR: -0.6, capTilt: 0.3 };
        }
        if (t < 2.95) {
          const u = seg(t, 2.4, 2.95);
          return { x: lerp(520, 610, u), y: lerp(lip, GROUND, u * u) - Math.sin(u * Math.PI) * 40, lean: -u * TAU * 0.9, eyes: 'wide', capTilt: 0.6, capOff: [6 * u, 0] };
        }
        const land = seg(t, 2.95, 3.3);
        const fix = sseg(t, 3.6, 4.4);
        return {
          x: 610, y: GROUND, sq: lerp(0.7, 1, easeOutBack(land)),
          eyes: t < 3.4 ? 'squint' : 'open', blink: blinkAt(t, 0.5),
          capTilt: lerp(0.7, 0.14, fix), capOff: [lerp(10, 0, fix), lerp(6, 0, fix)],
          armR: t > 3.5 && t < 4.5 ? lerp(1.9, -2.1, sseg(t, 3.5, 3.8)) : 1.9, armRLen: t > 3.5 && t < 4.5 ? 30 : 20,
          look: t > 4.5 ? [0.6, -0.2] : [0, 0],
        };
      };
      const p = rigChuo('s6', lt, pose);
      street(ctx, cam, { ...SKY.DAY, actors: [(c) => {
        if (lt < 2.4) {
          c.save(); c.beginPath(); c.rect(-1000, -1000, 4000, lip + 1000); c.clip();
          drawChuo(c, { ...p, shadow: false });
          c.restore();
        } else drawChuo(c, p);
      }] });
      return {};
    },
  },
  { // 镜7 片名
    title: '片名', d: 3, grade: { tint: [1, 0.97, 0.92], tintAmt: 0.12, sat: 0.92, vig: 0.25, wobble: 0.8 },
    sfx: [[0.15, 'motif', 0.8, { variant: 'title' }]],
    draw(ctx, lt) {
      ctx.fillStyle = '#f1e8d6'; ctx.fillRect(0, 0, W, H);
      const a = sseg(lt, 0.15, 0.9) * (1 - sseg(lt, 2.5, 3));
      ctx.save();
      ctx.globalAlpha = a;
      // 绿色笔刷底纹（呼应设定稿标题）
      ctx.fillStyle = 'rgba(150,170,110,0.5)';
      ctx.beginPath(); ctx.moveTo(620, 640); ctx.bezierCurveTo(800, 600, 1100, 610, 1320, 628); ctx.lineTo(1310, 668); ctx.bezierCurveTo(1100, 650, 820, 650, 630, 676); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4e3c2e';
      ctx.font = '180px TitleBrush, "WenQuanYi Zen Hei", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('一杯热水', W / 2 + 10, 560);
      drawMug(ctx, W / 2, 400, 1.6, { steam: 0 });
      ctx.restore();
      return { fx: [emitScreen('steam', W / 2, 300, lt, { scale: 1.6, alpha: a })] };
    },
  },
  { // 镜8 全景：环卫阿姨推车上坡；对街矮墙上的搪瓷杯冒着热气
    title: '阿姨上坡', d: 6, grade: GR.EARLY,
    sfx: [[0, 'cart', 0.6, { dur: 4.2 }], [0, 'footsteps', 0.35, { dur: 4.2 }], [4.4, 'sweep', 0.45, { dur: 1.6 }]],
    draw(ctx, lt) {
      const cam = { x: 1250, y: 640, z: 0.78 };
      const cartX = lerp(-300, X.cart, easeOut(seg(lt, 0, 4.2)));
      const moving = lt < 4.0;
      const ax = cartX - 185;
      const pose = (t) => ({ x: 610, y: GROUND, blink: blinkAt(t), look: t < 3 ? [-1, 0] : [1, -0.4] });
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.25 }, cart: { x: cartX, wheelRot: cartX / 26, broomInCart: true },
        actors: [
          (c) => drawChuo(c, rigChuo('s8', lt, pose)),
          (c) => drawAuntie(c, { x: ax, y: GROUND, walk: moving ? lt * 6.5 : null, breath: true, headTurn: lt > 5 ? 0.5 : 0,
            handF: moving ? [48, -228] : [36, -150], handB: moving ? [40, -232] : [-30, -150] }),
        ] });
      return { fx: [
        emit('steam', cam, X.mug, WALL_TOP - 58, lt),
        emit('breath', cam, ax + 38, GROUND - 300, lt, { alpha: 0.7 }),
      ] };
    },
  },
  { // 镜9 近景：阿姨四下看看，捧起杯子喝一口，双手捂着取暖。杯柄上系着麻绳结
    title: '一杯热水', d: 6, grade: GR.EARLY,
    sfx: [[0, 'footsteps', 0.45, { dur: 1.5 }], [3.3, 'clink', 0.3], [4.1, 'sip', 0.7], [4.8, 'sigh', 0.6]],
    draw(ctx, lt) {
      const cam = { x: 1960, y: 620, z: 2.0 };
      const ax = lerp(1700, 1925, easeOut(seg(lt, 0, 1.5)));
      const held = lt > 3.25;
      const reach = toLocal(ax, 1, X.mug + 24, WALL_TOP - 24);
      let hF = [36, -150], hB = [-30, -150], headTilt = 0, mugL = null;
      if (lt > 2.8) hF = [lerp(36, reach[0], sseg(lt, 2.8, 3.25)), lerp(-150, reach[1], sseg(lt, 2.8, 3.25))];
      if (held) {
        const toChest = sseg(lt, 3.3, 4.0), toMouth = sseg(lt, 4.0, 4.5) * (1 - sseg(lt, 4.9, 5.4));
        const chest = [40, -205], mouth = [44, -290];
        mugL = [lerp(lerp(reach[0], chest[0], toChest), mouth[0], toMouth), lerp(lerp(reach[1], chest[1], toChest), mouth[1], toMouth)];
        hF = mugL;
        hB = [lerp(-30, mugL[0] - 26, sseg(lt, 3.6, 4.1)), lerp(-150, mugL[1] + 6, sseg(lt, 3.6, 4.1))];
        headTilt = -0.22 * toMouth;
      }
      const headTurn = keys(lt, [[1.5, 0], [1.8, -1], [2.3, -1], [2.6, 0.7], [2.9, 0.4]]);
      const ap = { x: ax, y: GROUND, walk: lt < 1.5 ? lt * 6.5 : null, breath: true, headTurn, headTilt, eyesClosed: lt > 4.0, mouth: lt > 5.2 ? 'smile' : null, handF: hF, handB: hB };
      if (held) ap.itemsMid = mugInHand(mugL);
      street(ctx, cam, { ...SKY.DAY, mug: held ? null : { steam: 0.25 }, cart: { x: X.cart, broomInCart: true }, actors: [(c) => drawAuntie(c, ap)] });
      const mw = held ? [ax + mugL[0] - 6, GROUND + mugL[1] - 32] : [X.mug, WALL_TOP - 58];
      return { fx: [emit('steam', cam, mw[0], mw[1], lt), emit('breath', cam, ax + 40, GROUND - 300, lt, { alpha: 0.6 })] };
    },
  },

  // ---------- 3 掉落的信 ----------
  { // 镜10 近景：阿姨掏出信，看看杯子又看看四周，犹豫着塞回口袋，没塞好
    title: '犹豫', d: 5, grade: GR.DAY,
    sfx: [[0.8, 'paper', 0.45], [4.2, 'paper', 0.4]],
    draw(ctx, lt) {
      const cam = { x: 1945, y: 545, z: 2.8 };
      const ax = 1925;
      const out = sseg(lt, 0.5, 1.4) * (1 - sseg(lt, 3.9, 4.6));
      const pocket = [22, -188], view = [58, -236];
      const hF = [lerp(36, lerp(pocket[0], view[0], out), sseg(lt, 0, 0.5) * (1 - sseg(lt, 4.6, 5))), lerp(-150, lerp(pocket[1], view[1], out), sseg(lt, 0, 0.5) * (1 - sseg(lt, 4.6, 5)))];
      const headTurn = keys(lt, [[1.0, 0.2], [1.8, 0.8], [2.5, 0.8], [2.8, -1], [3.4, -1], [3.7, 0], [4, 0.1]]);
      const headTilt = keys(lt, [[1.0, 0.1], [1.8, 0.2], [2.6, 0], [3.5, 0.08], [3.7, -0.05], [3.9, 0.08]]);
      const ap = { x: ax, y: GROUND, breath: true, breathOff: 0.7, handF: hF, headTurn, headTilt,
        pocketLetter: lt > 4.4 ? { dy: -16, rot: -0.35 } : (out < 0.05 && lt < 1 ? {} : null) };
      if (out > 0.05) ap.itemsTop = (c) => drawEnvelope(c, hF[0] + 16, hF[1] - 14, 60, 40, -0.12 - (1 - out) * 0.4, { lw: 1.6 });
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, actors: [(c) => drawAuntie(c, ap)] });
      return { fx: [emit('steam', cam, X.mug, WALL_TOP - 58, lt), emit('breath', cam, ax + 40, GROUND - 300, lt, { alpha: 0.5 })] };
    },
  },
  { // 镜11 中景：她转身回去扫地，信从口袋滑出，落在矮墙脚下
    title: '信滑落', d: 4, grade: GR.DAY,
    sfx: [[0, 'footsteps', 0.4, { dur: 2.5 }], [1.0, 'paper', 0.5], [1.85, 'paperland', 0.45]],
    draw(ctx, lt) {
      const cam = { x: 1620, y: 650, z: 1.05 };
      const ax = lerp(1925, 1380, seg(lt, 0, 4));
      const ax1 = lerp(1925, 1380, 0.25);
      const fall = seg(lt, 1.0, 1.85);
      const lx = lerp(ax1 - 20, LETTER_X, fall), ly = lerp(GROUND - 192, GROUND - 16, easeIn(fall));
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, cart: { x: X.cart, broomInCart: true },
        actors: [
          (c) => drawAuntie(c, { x: ax, y: GROUND, dir: -1, walk: lt * 6.5, breath: true, pocketLetter: lt < 1.0 ? { dy: -16 - lt * 8, rot: -0.35 } : null }),
          (c) => { if (lt > 1.0) drawEnvelope(c, lx, ly, 60, 40, fall < 1 ? Math.sin(fall * 9) * 0.6 : 0.06); },
        ] });
      return { fx: [emit('steam', cam, X.mug, WALL_TOP - 58, lt)] };
    },
  },
  { // 镜12 中景：戳戳一路小跑溜过街，包底擦着地，捡起比它还大的信
    title: '捡信', d: 3, grade: { ...GR.DAY, dof: [0.42, 0.42, 7] },
    sfx: [[0, 'scamper', 0.55, { dur: 1.8 }], [0, 'bell', 0.25], [2.0, 'paper', 0.5]],
    draw(ctx, lt) {
      const cam = { x: 1740, y: 820, z: 2.6 };
      const pose = (t) => {
        const x = lerp(1430, LETTER_X - 30, easeOut(seg(t, 0, 1.8)));
        const lift = sseg(t, 2.0, 2.5);
        return { x, y: GROUND, walk: t < 1.8 ? t * 17 : null, lean: t < 1.8 ? 0.15 : (t < 2.1 ? 0.3 : 0), sq: t > 1.8 && t < 2.1 ? 0.9 : 1, bagOffset: [0, 3],
          armR: lerp(1.9, -1.3, lift), armL: lerp(1.2, -1.6, lift), look: [0.4, lerp(0.6, -0.6, lift)], blink: blinkAt(t, 0.3),
          extra: t > 2.0 ? heldLetter(lerp(30, 6, lift), lerp(-12, -92, lift), lerp(0.06, -0.08, lift)) : null };
      };
      const p = rigChuo('s12', lt, pose);
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, actors: [
        (c) => { if (lt <= 2.0) drawEnvelope(c, LETTER_X, GROUND - 16, 60, 40, 0.06); },
        (c) => drawChuo(c, p),
      ] });
      return {};
    },
  },
  { // 镜13 一组特写：三步验信（对光看、贴耳摇、闻一闻）
    title: '三步验信', d: 6, grade: (lt) => ({ ...GR.DAY, rays: lt < 2 ? [0.66, 0.0, 0.55] : [0.9, 0.0, 0.2] }),
    sfx: [[0.3, 'shimmer', 0.35], [2.3, 'candyrattle', 0.9, { dur: 1.1 }], [4.3, 'sniff', 0.6], [4.9, 'happy', 0.4]],
    draw(ctx, lt) {
      const step = lt < 2 ? 0 : lt < 4 ? 1 : 2;
      const cam = [{ x: 1800, y: 800, z: 5.0 }, { x: 1770, y: 830, z: 5.6 }, { x: 1795, y: 830, z: 6.0 }][step];
      const cx = LETTER_X - 30;
      const pose = (t) => {
        const s = t < 2 ? 0 : t < 4 ? 1 : 2;
        if (s === 0) return { x: cx, y: GROUND, armR: -1.75, armRLen: 32, armL: -1.45, armLLen: 32, look: [0.2, -1], eyes: 'wide',
          extra: heldLetter(4, -136, 0.04, { light: 0.75, candyShadow: 0.55 * sseg(t, 0.4, 1.0) }) };
        if (s === 1) {
          const sh = t > 2.3 && t < 3.4 ? Math.sin(t * 46) * 4 : 0;
          return { x: cx, y: GROUND, armR: -2.5, armRLen: 26, look: [-0.5, 0], eyes: 'closed', ear: -0.15,
            extra: heldLetter(-44 + sh, -84, 1.45) };
        }
        return { x: cx, y: GROUND, lean: 0.08, armR: -0.3, armRLen: 26, armL: -0.5, eyes: t > 4.8 ? 'happy' : 'open', blink: blinkAt(t, 1),
          extra: heldLetter(22, -50, 0.18) };
      };
      const p = rigChuo('s13', lt, pose);
      street(ctx, cam, { ...SKY.DAY, actors: [(c) => {
        drawChuo(c, p);
        if (step === 1 && lt > 2.3 && lt < 3.4) drawMarks(c, cx - 44, GROUND - 84, 'shake', lt - 2.3, 1.1);
        if (step === 2 && lt > 4.9) drawMarks(c, cx + 28, GROUND - 92, 'spark', lt - 4.9, 0.9);
      }] });
      const fx = [];
      if (step === 0) fx.push(emit('dust', cam, cx + 40, GROUND - 160, lt, { spread: [400, 200], scaleMul: 0.4 }));
      if (step === 2 && lt > 4.9) fx.push(emit('spark', cam, cx + 30, GROUND - 90, lt - 4.9, { scaleMul: 0.3 }));
      return { fx };
    },
  },
  { // 镜14 主观镜头：把信塞进邮差包，抬头看见杯柄上的麻绳结
    title: '绳结', d: 2, grade: GR.DAY,
    sfx: [[0.25, 'paper', 0.45], [1.3, 'hmm', 0.5]],
    draw(ctx, lt) {
      const cam = camK(lt, [[0, { x: 1790, y: 840, z: 4 }], [0.9, { x: 1790, y: 840, z: 4 }], [1.8, { x: X.mug + 30, y: WALL_TOP - 24, z: 7 }]]);
      const cx = LETTER_X - 30;
      const put = sseg(lt, 0.1, 0.7);
      const p = rigChuo('s14', lt, (t) => ({ x: cx, y: GROUND, armR: lerp(-0.3, 1.9, sseg(t, 0.4, 0.8)), look: t > 0.8 ? [0.7, -1] : [0.6, 0.3],
        bigLetter: t > 0.7 ? {} : null, extra: t < 0.7 ? heldLetter(lerp(22, 46, put), lerp(-50, -64, put), lerp(0.18, -0.25, put)) : null }));
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, actors: [(c) => drawChuo(c, p)] });
      return { fx: [emit('steam', cam, X.mug, WALL_TOP - 58, lt)] };
    },
  },

  // ---------- 4 救出团团 ----------
  { // 镜15 中景：对街垃圾桶传来窸窣声，桶沿上一团皱纸动了一下
    title: '窸窣', d: 4, grade: GR.DAY,
    sfx: [[0.4, 'rustle', 0.7], [1.3, 'notice', 0.35], [2.4, 'rustle', 0.4]],
    draw(ctx, lt) {
      const cam = { x: 1240, y: 760, z: 1.15 };
      const jig = (lt > 0.4 && lt < 1.0) || (lt > 2.4 && lt < 2.8) ? Math.sin(lt * 50) * 0.12 : 0;
      const p = rigChuo('s15', lt, (t) => ({ x: LETTER_X - 30, y: GROUND, flip: t > 1.1 ? -1 : 1, bigLetter: {}, look: t > 1.1 ? [0.6, 0] : [0.5, -0.8], eyes: t > 1.2 && t < 2.2 ? 'wide' : 'open', blink: blinkAt(t, 2) }));
      street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, cart: { x: X.cart, broomInCart: true },
        beforeCan: (c) => drawTuan(c, { x: X.can - 4, y: CAN_TOP + 22, r: 32, eyes: 0, rot: jig, shadow: false }),
        actors: [(c) => { drawChuo(c, p); if (lt > 1.25) drawMarks(c, LETTER_X - 30, GROUND - 118, '!', lt - 1.25, 0.9); }] });
      return {};
    },
  },
  { // 镜16 特写：褶缝里露出两个铅笔点眼睛，和戳戳对视，又“嗖”地缩回去
    title: '对视', d: 4, grade: GR.DAY,
    sfx: [[0.8, 'rustlesoft', 0.4], [2.6, 'crumple', 0.85], [2.62, 'whoosh', 0.35]],
    draw(ctx, lt) {
      const cam = { x: X.can, y: CAN_TOP - 16, z: 5 };
      const open = sseg(lt, 0.8, 1.3) * (1 - blinkAt(lt - 1.9 + 3.3 * 10, 0));
      const hide = lt > 2.6;
      const sink = easeIn(seg(lt, 2.75, 3.2));
      street(ctx, cam, { ...SKY.DAY,
        beforeCan: (c) => drawTuan(c, { x: X.can - 4, y: CAN_TOP + 22 + sink * 40, r: 32, eyes: hide ? 0 : 2, eyeOpen: open, look: [0.1, 0.1], squeeze: hide ? 1 : 0.15, shadow: false, tremble: hide ? 0.6 : 0 }) });
      return {};
    },
  },
  { // 镜17 全景：阿姨扫到垃圾桶边，揭开桶盖，把垃圾袋往上提
    title: '要清空了', d: 5, grade: GR.DAY,
    sfx: [[0, 'sweep', 0.6, { dur: 2.2 }], [2.3, 'broomlean', 0.4], [2.7, 'lid', 0.6], [3.3, 'plastic', 0.6, { dur: 1.7 }]],
    draw(ctx, lt) {
      const cam = { x: 760, y: 690, z: 1.45 };
      const ax = lerp(380, 600, easeOut(seg(lt, 0, 2.2)));
      const sw = Math.sin(lt * 7);
      const sweeping = lt < 2.2;
      const bend = lt > 3.0 ? 0.32 * sseg(lt, 3.0, 3.4) : 0;
      const lid = sseg(lt, 2.6, 3.1);
      const up = sseg(lt, 3.4, 5);
      let hF = [36, -150], hB = [-30, -150];
      if (sweeping) { hF = [70 + sw * 16, -150]; hB = [40 + sw * 16, -190]; }
      else if (lt < 2.6) { hF = [lerp(70, 160, sseg(lt, 2.2, 2.5)), -230]; }
      else if (lt < 3.1) { hF = [96, lerp(-160, -230, lid)]; }
      else { const top = toLocal(ax, 1, X.can, CAN_TOP - 18 - up * 50); hF = unbend([top[0] + 14, top[1]], bend); hB = unbend([top[0] - 14, top[1] + 4], bend); }
      const ap = { x: ax, y: GROUND, walk: sweeping ? lt * 4 : null, bend, handF: hF, handB: hB, headTurn: 0.3, headTilt: 0.12 };
      if (sweeping) ap.itemsMid = (c) => drawBroom(c, 110 + sw * 22, 0, -0.5 + sw * 0.08, 0.95);
      street(ctx, cam, { ...SKY.DAY, canLidOpen: lerp(0.35, 1, lid), cart: { x: X.cart },
        actors: [
          (c) => drawSack(c, up, 0.2),
          (c) => { if (!sweeping) drawBroom(c, 806, GROUND, -0.3 * sseg(lt, 2.2, 2.5) - 0.0, 0.95); },
          (c) => drawAuntie(c, ap),
        ] });
      return {};
    },
  },
  { // 镜18 中景，快切：戳戳冲回对街，被立着的扫帚绊了个跟头，帽子歪到脸上
    title: '绊倒', d: 6, grade: GR.DAY,
    sfx: [[0, 'scamper', 0.65, { dur: 2.85 }], [0, 'bellmess', 0.4, { dur: 2.8 }], [2.85, 'clatter', 0.7], [2.9, 'bellmess', 0.8, { dur: 0.9 }], [3.75, 'thud', 0.6], [0, 'plastic', 0.25, { dur: 6 }]],
    shake: (lt) => (lt > 2.85 && lt < 3.05 ? 0.5 : 0),
    draw(ctx, lt) {
      const auntie = (c) => {
        const ax = 600, bend = 0.32, top = toLocal(ax, 1, X.can, CAN_TOP - 68);
        drawAuntie(c, { x: ax, y: GROUND, bend, headTurn: 0.3, headTilt: 0.12, handF: unbend([top[0] + 14, top[1]], bend), handB: unbend([top[0] - 14, top[1] + 4], bend) });
      };
      const broomRot = -0.3 + (lt > 2.85 ? Math.sin((lt - 2.85) * 18) * 0.12 * Math.exp(-(lt - 2.85) * 3) : 0);
      if (lt < 2.5) {
        const x = lerp(1760, 1020, seg(lt, 0, 2.5));
        const cam = { x: x - 80, y: 830, z: 2.2 };
        const p = rigChuo('s18a', lt, (t) => ({ x: lerp(1760, 1020, seg(t, 0, 2.5)), y: GROUND, flip: -1, walk: t * 22, lean: 0.22, bigLetter: { dy: Math.sin(t * 22) * 3 }, look: [0.5, 0], eyes: 'open' }));
        street(ctx, cam, { ...SKY.DAY, mug: { steam: 0.2 }, actors: [(c) => drawChuo(c, p)] });
        return {};
      }
      const cam = { x: 830, y: 830, z: 2.6 };
      const pose = (t) => {
        if (t < 2.85) return { x: lerp(1160, 840, seg(t, 2.5, 2.85)), y: GROUND, flip: -1, walk: t * 22, lean: 0.22, bigLetter: {}, eyes: 'open' };
        if (t < 3.75) {
          const u = seg(t, 2.85, 3.75);
          return { x: lerp(840, 905, u), y: GROUND, lift: -Math.abs(Math.sin(u * Math.PI * 2)) * 34, flip: -1, lean: u * TAU * 2, eyes: 'squint', bigLetter: {}, capTilt: 0.14 + u * 1.2, capOff: [0, u * 20] };
        }
        const up = sseg(t, 4.6, 5.4);
        const shake = t > 5.4 ? Math.sin(t * 30) * 0.08 * (1 - seg(t, 5.4, 6)) : 0;
        return { x: 905, y: GROUND, flip: -1, sq: lerp(0.8, 1, sseg(t, 3.75, 4.2)), bigLetter: {}, lean: shake,
          capTilt: lerp(-0.25, 0.14, up), capOff: [lerp(-4, 0, up), lerp(24, 0, up)], eyes: up > 0.5 ? 'open' : 'squint',
          armR: t > 4.4 && t < 5.5 ? -2.0 : 1.9, armRLen: t > 4.4 && t < 5.5 ? 30 : 20 };
      };
      const p = rigChuo('s18b', lt, pose);
      street(ctx, cam, { ...SKY.DAY, canLidOpen: 1, actors: [
        (c) => drawSack(c, 1, 0.3),
        auntie,
        (c) => drawBroom(c, 806, GROUND, broomRot, 0.95),
        (c) => drawChuo(c, p),
      ] });
      return {};
    },
  },
  { // 镜19 近景：袋口正在收紧，戳戳扒住袋沿探进去，拽出团团，一起翻出来摔在地上
    title: '拽出团团', d: 7, grade: GR.DAY,
    sfx: [[0, 'plastic', 0.6, { dur: 4.4 }], [0, 'scamper', 0.4, { dur: 1 }], [1.0, 'jump', 0.45], [1.6, 'rustle', 0.7, { dur: 2 }], [1.6, 'bellmess', 0.6, { dur: 2 }], [3.6, 'pop', 0.6], [4.4, 'thud', 0.8], [4.45, 'crumple', 0.6], [4.7, 'tie', 0.6, { dur: 1.4 }]],
    shake: (lt) => (lt > 4.4 && lt < 4.6 ? 0.5 : 0),
    draw(ctx, lt) {
      const cam = { x: 790, y: 795, z: lerp(3.1, 2.6, sseg(lt, 4.4, 7)) };
      const neck = keys(lt, [[0, 0.25], [1.0, 0.35], [4.4, 0.42], [6.0, 1]]);
      const ax = 600, bend = 0.32;
      const sackTop = CAN_TOP - 68;
      const tw = Math.sin(lt * 12) * 6 * seg(lt, 4.4, 4.6) * (1 - seg(lt, 5.9, 6.1));
      const top = toLocal(ax, 1, X.can, sackTop);
      const ap = { x: ax, y: GROUND, bend, headTurn: 0.3, headTilt: 0.12, handF: unbend([top[0] + 10 + tw, top[1]], bend), handB: unbend([top[0] - 10 - tw, top[1] + 4], bend) };
      const rimX = X.can + 26, rimY = CAN_TOP - 40;
      const pose = (t) => {
        if (t < 1.0) return { x: lerp(1010, 830, seg(t, 0, 1.0)), y: GROUND, flip: -1, walk: t * 20, lean: 0.2 };
        if (t < 1.6) { const u = easeOut(seg(t, 1.0, 1.6)); return { x: lerp(830, rimX + 6, u), y: lerp(GROUND, rimY + 30, u), flip: -1, sq: 1.12, armR: -2.0, armRLen: 30, armL: -1.2, eyes: 'squint' }; }
        if (t < 3.6) return { x: rimX + 6, y: rimY - 6, flip: -1, lean: Math.PI * 0.9 + Math.sin(t * 9) * 0.08, walk: t * 26 };
        if (t < 4.4) { const u = seg(t, 3.6, 4.4); return { x: lerp(rimX + 6, 930, u), y: lerp(rimY - 6, GROUND, u * u) - Math.sin(u * Math.PI) * 60, flip: -1, lean: lerp(Math.PI * 0.9, -TAU * 0.05, u), armR: -1.0, eyes: 'squint' }; }
        return { x: 930, y: GROUND, flip: 1, sq: lerp(0.72, 0.9, sseg(t, 4.4, 4.9)), eyes: t < 5.2 ? 'squint' : 'open', blink: blinkAt(t, 0.2), look: t > 5.6 ? [-1, 0.3] : [0, 0], capTilt: 0.5 };
      };
      const p = rigChuo('s19', lt, pose);
      const tPose = (t) => {
        if (t < 3.6) return { x: X.can, y: CAN_TOP + 30, r: 34, hop: 0 };
        if (t < 4.4) { const u = seg(t, 3.6, 4.4); return { x: lerp(X.can, 840, u), y: GROUND, hop: (1 - u) * (GROUND - CAN_TOP) + Math.sin(u * Math.PI) * 70, r: 34 }; }
        return { x: 840, y: GROUND, hop: 0, r: 34 };
      };
      const tp = rigTuan('s19t', lt, tPose);
      street(ctx, cam, { ...SKY.DAY, canLidOpen: 1, actors: [
        (c) => drawSack(c, 1, neck),
        (c) => drawAuntie(c, ap),
        (c) => { if (lt > 1.6 && lt < 3.6) { drawChuo(c, p); c.save(); c.beginPath(); c.rect(0, CAN_TOP - 34, 3000, 1000); c.clip(); drawSack(c, 1, neck, true); c.restore(); c.save(); c.beginPath(); c.rect(0, CAN_TOP + 2, 3000, 1000); c.clip(); drawCan(c, { canLidOpen: 1 }); c.restore(); } },
        (c) => { if (lt >= 3.6) drawTuan(c, { ...tp, eyes: 0, squeeze: 0.9, tremble: lt > 4.6 ? 1 : 0, rot: lt < 4.4 ? (lt - 3.6) * 6 : 0 }); },
        (c) => { if (lt <= 1.6 || lt >= 3.6) drawChuo(c, p); },
      ] });
      return {};
    },
  },
  { // 镜20 中景：阿姨扎好袋子扔上清扫车，推车往坡上走了，什么也没发现
    title: '阿姨离开', d: 4, grade: GR.DAY,
    sfx: [[0.9, 'throw', 0.5], [1.4, 'thudsoft', 0.5], [1.5, 'lid', 0.4], [2.0, 'cart', 0.6, { dur: 2.2 }], [2.0, 'footsteps', 0.4, { dur: 2 }]],
    draw(ctx, lt) {
      const cam = { x: 640, y: 690, z: 1.35 };
      const lift = sseg(lt, 0, 0.9), fly = seg(lt, 0.95, 1.4);
      const cartX = lerp(X.cart, -420, easeIn(seg(lt, 2.0, 4.0)));
      const ax = lt < 1.6 ? 600 : (lt < 2.0 ? lerp(600, X.cart + 185, sseg(lt, 1.6, 2.0)) : cartX + 185);
      const dir = lt < 1.5 ? 1 : -1;
      const hold = toLocal(600, 1, X.can, lerp(CAN_TOP - 68, CAN_TOP - 150, lift));
      const ap = { x: ax, y: GROUND, dir, walk: lt > 1.6 ? lt * 6.5 : null, headTurn: lt < 1.5 ? 0.2 : 0,
        handF: lt < 0.95 ? [hold[0], hold[1]] : (lt < 2.0 ? [36, -150] : [48, -228]), handB: lt < 2.0 ? [-30, -150] : [40, -232] };
      street(ctx, cam, { ...SKY.DAY, canLidOpen: lt > 1.5 ? 0.0 : 1, bagInCan: false,
        cart: { x: cartX, dir: lt < 1.5 ? 1 : -1, wheelRot: -cartX / 26, bags: lt > 1.4 ? 1 : 0, broomInCart: lt > 1.9 },
        actors: [
          (c) => { if (lt < 1.9) drawBroom(c, 806, GROUND, -0.3, 0.95); },
          (c) => drawAuntie(c, ap),
          (c) => {
            if (lt < 0.95) drawTiedSack(c, X.can, lerp(CAN_TOP - 74, CAN_TOP - 156, lift));
            else if (lt < 1.4) drawTiedSack(c, lerp(X.can, X.cart, fly), lerp(CAN_TOP - 156, GROUND - 250, fly) - Math.sin(fly * Math.PI) * 120, fly * 3);
          },
          (c) => drawTuan(c, { x: 840, y: GROUND, r: 34, eyes: 0, squeeze: 0.9, tremble: 1 }),
          (c) => drawChuo(c, rigChuo('s20', lt, (t) => ({ x: 930, y: GROUND, sq: 0.9, look: t < 2 ? [-1, 0.3] : [-1, -0.2], blink: blinkAt(t), capTilt: 0.5 }))),
        ] });
      return {};
    },
  },
  { // 镜21 近景：团团缩成更小更皱的一团，发抖。戳戳原地转了一圈帽子，然后伸手轻轻拍拍它
    title: '拍拍', d: 6, grade: GR.DAY,
    sfx: [[0, 'tremble', 0.4, { dur: 4.5 }], [1.6, 'capspin', 0.45], [4.1, 'pat', 0.5], [4.6, 'pat', 0.5], [5.1, 'pat', 0.45]],
    draw(ctx, lt) {
      const cam = { x: 880, y: 850, z: 3.4 };
      const pose = (t) => {
        const o = { x: lerp(930, 900, sseg(t, 3.3, 4.0)), y: GROUND, sq: lerp(0.9, 1, sseg(t, 0, 0.5)), walk: t > 3.3 && t < 4.0 ? t * 12 : null,
          look: keys(t, [[0.5, [-1, 0.3]], [1.0, [1, 0]], [1.2, [-1, 0]], [1.4, [1, 0]], [1.6, [-1, 0.3]]]), blink: blinkAt(t, 0.8), capTilt: lerp(0.5, 0.14, sseg(t, 1.6, 3.3)) };
        if (t > 1.6 && t < 3.3) { o.capSpin = sseg(t, 1.7, 3.2); o.armR = -1.9; o.armRLen = 30; }
        if (t > 4.0) { o.armR = 2.95 + Math.sin(t * 11) * 0.18 * seg(t, 4.0, 4.2) * (1 - seg(t, 5.4, 5.6)); o.armRLen = 28; o.look = [-1, 0.4]; }
        return o;
      };
      const p = rigChuo('s21', lt, pose);
      const calm = sseg(lt, 4.2, 6);
      street(ctx, cam, { ...SKY.DAY, actors: [
        (c) => drawTuan(c, { x: 840, y: GROUND, r: 34, eyes: 0, squeeze: lerp(1, 0.75, calm), tremble: lerp(1, 0.3, calm) }),
        (c) => { drawChuo(c, p); if (lt < 1.6 && lt > 0.6) drawMarks(c, 960, GROUND - 92, 'sweat', 0, 1); },
      ] });
      return {};
    },
  },
  { // 镜22 特写：团团先露出一只眼睛，又露出另一只
    title: '两只眼睛', d: 4, grade: GR.DAY,
    sfx: [[1.0, 'rustlesoft', 0.5], [2.4, 'rustlesoft', 0.4]],
    draw(ctx, lt) {
      const cam = { x: 860, y: GROUND - 44, z: 5.6 };
      const p = rigChuo('s22', lt, () => ({ x: 900, y: GROUND, armR: 2.95, armRLen: 28, look: [-1, 0.4] }));
      const eyes = lt < 1.0 ? 0 : (lt < 2.4 ? 1 : 2);
      const open = lt < 2.4 ? sseg(lt, 1.0, 1.3) : 1;
      street(ctx, cam, { ...SKY.DAY, actors: [
        (c) => drawTuan(c, { x: 840, y: GROUND, r: 34, eyes, eyeOpen: open, look: [0.5, -0.1], squeeze: lerp(0.75, 0.35, sseg(lt, 1, 3.5)), tremble: 0.2 }),
        (c) => drawChuo(c, p),
      ] });
      return {};
    },
  },
];
