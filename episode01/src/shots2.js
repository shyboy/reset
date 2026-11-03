// 分镜 5–7 段（镜 23–42）：风与绳结、抵达、第二天清晨
'use strict';

// 窗内的老爷爷（在 drawWindow 的裁剪区域里绘制）
function grandpaInWindow(o = {}) {
  return (c, x, bot) => {
    drawGrandpa(c, { x: x + (o.dx ?? 30), y: bot + (o.dy ?? 130), s: 0.9, dir: o.dir ?? -1, handF: o.handF, handB: o.handB, headTurn: o.headTurn ?? 0, smile: o.smile ?? 0, itemsTop: o.itemsTop, curlF: o.curlF });
    if (o.dim !== false) { c.fillStyle = `rgba(45,38,30,${o.dim ?? 0.3})`; c.fillRect(x - 200, bot - 300, 400, 400); }
  };
}

// 橙色的糖（包着 / 剥开）
function drawCandy(ctx, x, y, s, open = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (open >= 2) open = -1; // -1：只有糖，没有糖纸
  if (open >= 0 && open < 1) {
    // 糖纸两端拧着
    for (const k of [-1, 1]) {
      ctx.save(); ctx.scale(k, 1);
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(28, -10 - open * 8); ctx.lineTo(28, 10 + open * 8); ctx.closePath();
      ctx.fillStyle = PAL.orangeSoft; ctx.fill(); ctx.strokeStyle = '#b5612a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }
  }
  if (open > 0) {
    // 摊开的糖纸
    ctx.save(); ctx.globalAlpha = open;
    ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(30, -22); ctx.lineTo(34, 18); ctx.lineTo(-28, 22); ctx.closePath();
    ctx.fillStyle = PAL.orangeSoft; ctx.fill(); ctx.strokeStyle = '#b5612a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  open = Math.max(open, 0) === open ? open : 1;
  ellipsePath(ctx, 0, 0, 14, 13);
  volFill(ctx, -4, -4, 16, '#f7b077', '#d0692a'); inkStroke(ctx, 1.4, '#8a4a20', 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ellipsePath(ctx, -5, -5, 3.5, 2.5, -0.5); ctx.fill();
  if (open < 0.5) {
    ctx.globalAlpha = 1 - open * 2;
    ellipsePath(ctx, 0, 0, 15, 14); ctx.fillStyle = 'rgba(235,150,90,0.75)'; ctx.fill(); ctx.strokeStyle = '#b5612a'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();
}

const SHOTS_B = [
  // ---------- 5 风与绳结 ----------
  { // 镜23 全景：海风从坡下卷上来，团团被吹起，滚向对街
    title: '海风', d: 5, grade: { ...GR.DAY, tint: [0.95, 0.97, 0.98], tintAmt: 0.25 },
    sfx: [[0.5, 'wind', 1.0, { dur: 4.5 }], [1.3, 'paperroll', 0.6, { dur: 3.7 }], [1.45, 'notice', 0.4], [2.8, 'scamper', 0.5, { dur: 2.2 }], [2.8, 'bellmess', 0.5, { dur: 2.2 }]],
    draw(ctx, lt) {
      const cam = { x: 1260, y: 720, z: 0.85 };
      const u = easeIn(seg(lt, 1.2, 5.2));
      const tx = lerp(840, 2160, u);
      const hop = lt > 1.2 ? Math.abs(Math.sin((tx - 840) / 70)) * 50 * (1 - u * 0.5) + 30 * (1 - seg(lt, 1.2, 2)) * seg(lt, 1.2, 1.4) : 0;
      const wind = (t) => (t > 0.6 ? Math.sin(t * 9) * 3 + 6 : 0);
      const p = rigChuo('s23', lt, (t) => ({ x: lerp(900, 1320, easeIn(seg(t, 2.8, 5))), y: GROUND, walk: t > 2.8 ? t * 20 : null, lean: t > 2.8 ? 0.2 : -0.05,
        armR: t > 0.9 ? -1.9 : 2.95, armRLen: t > 0.9 ? 30 : 20, eyes: t > 1.3 ? 'wide' : 'open', look: t > 1.3 ? [1, 0] : [-1, 0.4] }), { wind });
      street(ctx, cam, { ...SKY.DAY, windy: true, mug: { steam: 0.15 }, actors: [
        (c) => drawTuan(c, { x: tx, y: GROUND, r: 34, hop, rot: (tx - 840) / 34, eyes: 0, squeeze: 0.6 }),
        (c) => { drawChuo(c, p); if (lt > 1.45 && lt < 2.6) drawMarks(c, 900, GROUND - 118, '!', lt - 1.45, 1); },
      ] });
      return { fx: [emitScreen('wind', -200, 520, lt, { spread: [300, 760], vel: [1700, -40], alpha: sseg(lt, 0.4, 1.0) })] };
    },
  },
  { // 镜24 跟拍：戳戳一手按着信、一手扶着帽子追；团团滚下台阶又弹起来
    title: '追', d: 6, grade: { ...GR.DAY, tint: [0.95, 0.97, 0.98], tintAmt: 0.25 },
    sfx: [[0, 'scamper', 0.6, { dur: 6 }], [0, 'bellmess', 0.55, { dur: 6 }], [0, 'paperroll', 0.55, { dur: 5.6 }], [0, 'wind', 0.6, { dur: 5 }], [2.7, 'bounce', 0.5], [3.3, 'bounce', 0.45], [3.9, 'bounce', 0.4], [4.4, 'bounce', 0.35]],
    draw(ctx, lt) {
      const tx = lerp(1900, 2480, seg(lt, 0, 6));
      const ty = groundY(tx);
      const hop = Math.abs(Math.sin((tx - 1900) / 50)) * 36;
      const cxp = (t) => lerp(1640, 2390, seg(t, 0, 6));
      const p = rigChuo('s24', lt, (t) => { const x = cxp(t); return { x, y: groundY(x), walk: t * 20, lean: 0.2, armR: -1.9, armRLen: 30, bigLetter: { dy: Math.sin(t * 20) * 4 }, eyes: 'open', look: [1, 0.2] }; });
      const mid = (tx + p.x) / 2;
      const cam = { x: mid, y: groundY(mid) - 140, z: 1.6 };
      street(ctx, cam, { ...SKY.DAY, windy: true, mug: { steam: 0.15 }, actors: [
        (c) => drawTuan(c, { x: tx, y: ty, r: 34, hop, rot: (tx - 840) / 34, eyes: 0, squeeze: 0.6 }),
        (c) => drawChuo(c, p),
      ] });
      return { fx: [emitScreen('wind', -200, 520, lt, { spread: [300, 760], vel: [1500, -40], alpha: 0.7 })] };
    },
  },
  { // 镜25 中景：团团撞上旧木门停下；戳戳赶到；团团“嗖”地钻进邮差包
    title: '钻包', d: 4, grade: GR.DAY,
    sfx: [[0.45, 'bump', 0.6], [1.4, 'pant', 0.45, { dur: 1.6 }], [2.9, 'whoosh', 0.5], [3.25, 'poof', 0.6], [3.3, 'bell', 0.45]],
    draw(ctx, lt) {
      const cam = { x: 2540, y: 900, z: 2.1 };
      const pose = (t) => ({ x: lerp(2310, 2430, easeOut(seg(t, 0.8, 2.0))), y: LOW, walk: t > 0.8 && t < 2.0 ? t * 18 : null, lean: t < 2.0 ? 0.15 : 0, mouth: t > 1.8 && t < 3.0 ? 'pant' : null,
        bigLetter: {}, sq: t > 2.0 && t < 3.0 ? 1 + Math.sin(t * 14) * 0.03 : 1, look: t < 2.6 ? [1, 0.3] : [0.6, 0.8],
        tuanInBag: t > 3.25 ? { eyes: 2, look: [0.6, 0], r: 24 } : null, bagStretch: t > 3.25 && t < 3.5 ? [1.12, 0.9] : [1, 1], eyes: t > 3.25 && t < 3.8 ? 'wide' : 'open' });
      const p = rigChuo('s25', lt, pose);
      const bagW = [p.x + 50, LOW - 44];
      const tPose = (t) => {
        if (t < 0.5) return { x: lerp(2440, 2522, t / 0.5), y: LOW, hop: 0, r: 34 };
        if (t < 2.9) return { x: lerp(2522, 2510, sseg(t, 0.5, 0.9)), y: LOW, hop: 0, r: 34 };
        const u = seg(t, 2.9, 3.25);
        return { x: lerp(2510, bagW[0], u), y: lerp(LOW, bagW[1] + 24, u), hop: Math.sin(u * Math.PI) * 60, r: lerp(34, 24, u) };
      };
      const tp = rigTuan('s25t', lt, tPose);
      street(ctx, cam, { ...SKY.DAY, actors: [
        (c) => drawChuo(c, p),
        (c) => { if (lt < 3.25) drawTuan(c, { ...tp, rot: lt < 0.5 ? lt * 6 : 3, eyes: lt > 1.0 ? 2 : 0, scared: lt > 1.0 && lt < 2.2, look: lt > 2.4 ? [-1, 0.4] : [-1, 0], squeeze: lt < 2.2 ? 0.7 : 0.4 }); },
        (c) => { if (lt > 2.45 && lt < 2.9) drawMarks(c, 2510, LOW - 84, '!', lt - 2.45, 0.8); },
      ] });
      return {};
    },
  },
  { // 镜26 特写：门把手上系着一个一模一样的麻绳结。戳戳愣住，低头看信，再抬头看绳结
    title: '一模一样的结', d: 5, grade: GR.DAY,
    sfx: [[0, 'windfade', 0.35, { dur: 1.2 }], [2.8, 'notice', 0.45]],
    draw(ctx, lt) {
      const cam = { x: 2610, y: LOW - 80, z: 3.4 };
      const p = rigChuo('s26', lt, (t) => ({ x: 2565, y: LOW, bigLetter: {}, tuanInBag: { eyes: 2, look: [0.6, -0.6], r: 24 },
        look: keys(t, [[1.4, [0.8, -0.9]], [1.7, [0.6, 0.9]], [2.5, [0.6, 0.9]], [2.8, [0.8, -0.9]]]), eyes: t > 2.8 ? 'wide' : 'open', blink: t < 2.8 ? blinkAt(t, 1) : 0 }));
      street(ctx, cam, { ...SKY.DAY, actors: [(c) => { drawChuo(c, p); if (lt > 3.4) drawMarks(c, 2580, LOW - 128, '?', lt - 3.4, 1); }] });
      return {};
    },
  },
  { // 镜27 摇镜，从下往上：绳结到处都是——门口的信箱、窗栏、门边的盲杖
    title: '到处都是绳结', d: 6, grade: GR.DAY,
    sfx: [[0, 'roomtone', 0.35, { dur: 6 }]],
    draw(ctx, lt) {
      const cam = camK(lt, [[0, { x: 2660, y: 985, z: 2.4 }], [2.2, { x: 2690, y: 860, z: 2.4 }], [5.6, { x: 2860, y: 720, z: 2.0 }]]);
      const p = rigChuo('s27', lt, (t) => ({ x: 2565, y: LOW, bigLetter: {}, tuanInBag: { eyes: 2, look: [0.4, -1], r: 24 }, look: [0.5, -1], blink: blinkAt(t, 2) }));
      street(ctx, cam, { ...SKY.DAY, actors: [(c) => drawChuo(c, p)] });
      return {};
    },
  },
  { // 镜28 中景：戳戳爬上窗台，团团在包里只露出两只眼睛；戳戳用手按住铃铛
    title: '窗台', d: 6, grade: GR.DAY,
    sfx: [[0, 'climb', 0.5, { dur: 2.4 }], [0.3, 'bellmess', 0.35, { dur: 1.8 }], [2.5, 'bell', 0.3], [3.0, 'bellmute', 0.55]],
    draw(ctx, lt) {
      const cam = { x: 2860, y: 830, z: 2.6 };
      const pose = (t) => {
        if (t < 2.4) { const u = seg(t, 0, 2.4); return { x: lerp(2730, 2790, u), y: lerp(LOW, 900, smooth(u)) - Math.abs(Math.sin(u * 9)) * 8, walk: t * 16, lean: -0.15, armR: -1.9, armRLen: 28, eyes: 'squint', tuanInBag: { eyes: 2, look: [0, -1], r: 24 } }; }
        return { x: 2790, y: 900, look: [1, -0.1], tuanInBag: { eyes: 2, look: [1, -0.2], r: 24, dx: 2 }, bellHeld: t > 3.0, blink: blinkAt(t, 0.5) };
      };
      const p = rigChuo('s28', lt, pose);
      street(ctx, cam, { ...SKY.DAY, grandpaWin: grandpaInWindow({ dx: 70, dim: 0.35 }), actors: [(c) => drawChuo(c, p)] });
      return {};
    },
  },
  { // 镜29 窗内：闭着眼的老爷爷，手指顺着墙上的绳子摸到水壶。窗台上一排系好绳结的旧搪瓷杯
    title: '窗内', d: 8, grade: { ...GR.DAY, side: [-1, 0.35], rays: [0.0, 0.2, 0.25] },
    sfx: [[0, 'roomtone', 0.55, { dur: 8 }], [0, 'footsoft', 0.35, { dur: 6 }], [0, 'rope', 0.3, { dur: 6 }], [6.6, 'kettle', 0.55], [7.2, 'clink', 0.3]],
    draw(ctx, lt) {
      // 室内背景
      ctx.fillStyle = '#cdbfa8'; ctx.fillRect(0, 0, W, H);
      mottle(ctx, 0, 0, W, H, '#a8977c', 60, 91, 90, 0.12);
      ctx.fillStyle = '#a3917a'; ctx.fillRect(0, 960, W, 120);
      // 挂历、旧收音机
      roundRectPath(ctx, 250, 260, 140, 190, 4); fillInk(ctx, '#e8e0cf', 2);
      ctx.fillStyle = 'rgba(140,110,80,0.4)'; for (let i = 0; i < 5; i++) ctx.fillRect(270, 320 + i * 22, 100, 6);
      // 桌子 + 水壶
      roundRectPath(ctx, 1470, 760, 330, 24, 4); fillInk(ctx, PAL.wood, 2);
      ctx.fillStyle = PAL.woodDark; ctx.fillRect(1490, 784, 18, 200); ctx.fillRect(1762, 784, 18, 200);
      ctx.save(); ctx.translate(1640, 760);
      ctx.beginPath(); ctx.moveTo(-70, 0); ctx.bezierCurveTo(-80, -90, 80, -90, 70, 0); ctx.closePath();
      volFill(ctx, -20, -50, 90, '#d6d8d4', '#9a9e9a'); inkStroke(ctx, 2.2);
      ctx.beginPath(); ctx.moveTo(60, -30); ctx.lineTo(110, -70); ctx.lineTo(104, -76); ctx.lineTo(56, -48); ctx.closePath(); fillInk(ctx, '#bfc2be', 1.8);
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -78, 46, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.strokeStyle = PAL.woodLight; ctx.lineWidth = 4.5; ctx.stroke();
      drawKnot(ctx, -30, -112, 1.4);
      ctx.restore();
      // 墙上的绳子（带结）
      ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(120, 600); ctx.quadraticCurveTo(800, 640, 1560, 610); ctx.stroke();
      ctx.strokeStyle = PAL.rope; ctx.lineWidth = 4; ctx.stroke();
      for (let x = 260; x < 1560; x += 260) drawKnot(ctx, x, 600 + Math.sin((x - 120) / 1440 * Math.PI) * 18, 1.3);
      // 老爷爷
      const gx = lerp(520, 1300, smooth(seg(lt, 0, 6.4)));
      const s = 2.0, gy = 1180;
      const ropeY = (x) => 600 + Math.sin(clamp((x - 120) / 1440) * Math.PI) * 18;
      const hx = lt < 6.4 ? gx + 120 : lerp(gx + 120, 1600, sseg(lt, 6.4, 7.0));
      const hy = lt < 6.4 ? ropeY(gx + 120) + 4 : lerp(ropeY(gx + 120), 690, sseg(lt, 6.4, 7.0));
      drawGrandpa(ctx, { x: gx, y: gy + Math.abs(Math.sin(lt * 2.4)) * -4, s, dir: 1, handF: [(hx - gx) / s, (hy - gy) / s], handFRot: -0.1, handB: [-30, -150], headTilt: 0.06, curlF: 0.2 });
      // 窗台（前景）+ 洗净的搪瓷杯
      ctx.fillStyle = '#bdb2a0'; ctx.fillRect(0, 900, W, 180);
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(0, 900); ctx.lineTo(W, 900); ctx.stroke(); ctx.globalAlpha = 1;
      for (const [mx, i] of [[330, 0], [470, 1], [610, 2]]) drawMug(ctx, mx, 902, 2.3, { lid: false, rot: (i - 1) * 0.04 });
      // 前景的窗框和铁栏
      ctx.fillStyle = '#5b5145';
      ctx.fillRect(0, 0, 70, H); ctx.fillRect(W - 70, 0, 70, H); ctx.fillRect(0, 0, W, 50);
      ctx.fillStyle = 'rgba(50,48,45,0.88)';
      for (const bx of [430, 900, 1370]) ctx.fillRect(bx, 0, 22, 900);
      drawKnot(ctx, 911, 420, 2.4);
      return { fx: [emitScreen('steam', 1745, 680, lt, { scale: 1.4 }), emitScreen('dust', 700, 400, lt, { spread: [900, 600] })], grade: { dof: [0.62, 0.7, 4] } };
    },
  },

  // ---------- 6 抵达 ----------
  { // 镜30 近景：窗风吹过，团团缩了一下，纸角蹭到窗栏上的绳结；戳戳看看绳结，再看看老爷爷摸索的手，恍然大悟
    title: '恍然大悟', d: 5, grade: GR.DAY,
    sfx: [[0.6, 'windsoft', 0.5, { dur: 1.0 }], [1.0, 'paperbrush', 0.6], [3.6, 'realize', 0.6]],
    draw(ctx, lt) {
      const cam = { x: 2840, y: 840, z: 3.8 };
      const shrink = sseg(lt, 0.7, 1.0) * (1 - sseg(lt, 2.0, 2.6) * 0.5);
      const real = lt > 3.6;
      const p = rigChuo('s30', lt, (t) => ({ x: 2790, y: 900, bellHeld: true,
        tuanInBag: { eyes: 2, r: 24, squeeze: shrink, tremble: shrink, dx: lerp(2, -6, shrink), dy: lerp(0, 6, shrink), look: [0, 0] },
        look: keys(t, [[1.1, [0.2, 0]], [1.4, [0.6, 0.8]], [2.2, [0.6, 0.8]], [2.5, [1, -0.3]], [3.4, [1, -0.3]]]),
        eyes: t > 3.6 ? 'wide' : 'open', ear: t > 3.6 ? -0.25 * sseg(t, 3.6, 3.8) : 0, blink: t < 3.6 ? blinkAt(t, 0.4) : 0 }));
      const gh = [lerp(-90, -70, Math.sin(lt * 1.2) * 0.5 + 0.5), -150 + Math.sin(lt * 2) * 6];
      street(ctx, cam, { ...SKY.DAY, grandpaWin: grandpaInWindow({ dx: 60, dim: 0.25, dir: -1, handF: gh, curlF: 0.1 }), actors: [(c) => {
        drawChuo(c, p);
        if (real) drawMarks(c, 2800, 900 - 122, '!', lt - 3.6, 0.9);
      }] });
      const fx = [];
      if (lt > 0.6 && lt < 1.6) fx.push(emitScreen('wind', -200, 500, lt - 0.6, { spread: [200, 600], vel: [1300, -30], alpha: 0.5 }));
      if (real) fx.push(emit('spark', cam, 2800, 900 - 110, lt - 3.6, { scaleMul: 0.35 }));
      return { fx };
    },
  },
  { // 镜31 中景：把信插进门把手的绳结里，退后两步，掌心对准信封，“咚”地盖下一戳——橙色
    title: '盖戳', d: 6, grade: (lt) => ({ ...GR.DAY, glow: lt > 4 ? 0.4 * (1 - seg(lt, 4, 5.5)) : 0 }),
    sfx: [[0.3, 'paper', 0.5], [1.0, 'jump', 0.4], [1.6, 'paper', 0.45], [2.25, 'step', 0.3], [2.65, 'step', 0.3], [4.0, 'dong', 1.0]],
    shake: (lt) => (lt > 4.0 && lt < 4.18 ? 0.7 : 0),
    draw(ctx, lt) {
      const cam = { x: 2650, y: 905, z: 2.7 };
      // 用近侧（带印记的）右手盖戳：角色朝左站（flip=-1），邮包在左边，不挡住门把上的信
      const P = Math.PI;
      const pose = (t) => {
        if (t < 0.9) { const u = sseg(t, 0.1, 0.8); return { x: 2600, y: LOW, flip: -1, armR: lerp(1.9, P + 0.5, u), armRLen: 26, bigLetter: t < 0.5 ? { dy: -u * 30 } : null, extra: t >= 0.5 ? heldLetter(-40, -84, 0.2) : null, look: [-0.5, -0.4] }; }
        if (t < 2.2) {
          const u = seg(t, 0.9, 1.8);
          return { x: lerp(2600, 2618, u), y: LOW, flip: -1, lift: -Math.sin(Math.min(1, seg(t, 0.9, 2.1)) * Math.PI) * 26, armR: P + 0.6, armRLen: 30, look: [-0.8, -0.6],
            extra: t < 1.7 ? heldLetter(lerp(-40, -50, u), lerp(-84, -86, u), 0.1) : null };
        }
        if (t < 3.9) {
          const back = sseg(t, 2.2, 3.2), wind = sseg(t, 3.2, 3.9);
          return { x: lerp(2618, 2560, back), y: LOW, flip: -1, walk: t < 3.2 ? -t * 10 : null, lean: -0.1 * wind, palm: t > 3.2, armR: lerp(1.9, P + 0.45, wind), armRLen: 24, look: [-1, -0.3], eyes: t > 3.5 ? 'squint' : 'open' };
        }
        const hit = sseg(t, 3.9, 4.0), rec = sseg(t, 4.4, 5.2);
        return { x: lerp(2560, 2594, hit) - rec * 50, y: LOW, flip: -1, lift: -14 * hit * (1 - rec), lean: lerp(-0.1, 0.1, hit) * (1 - rec), palm: true,
          armR: lerp(P + 0.45, P + 0.15, hit), armRLen: lerp(24, 44, hit) * (1 - rec * 0.5),
          stampColor: t < 5.2 ? PAL.orange : PAL.stampMark, eyes: t > 4.6 ? 'happy' : 'squint', look: [-1, -0.3] };
      };
      const p = rigChuo('s31', lt, pose);
      const stamp = lt >= 4.0 ? easeOutBack(seg(lt, 4.0, 4.15)) : 0;
      street(ctx, cam, { ...SKY.DAY, letterInKnot: lt > 1.7 ? { stamp, dy: lt < 2.0 ? -6 * (1 - seg(lt, 1.7, 2.0)) : 0 } : null, actors: [(c) => {
        drawChuo(c, p);
        if (lt > 4.0 && lt < 4.6) {
          // 冲击波纹
          const u = seg(lt, 4.0, 4.6);
          c.save(); c.globalAlpha = 1 - u; c.strokeStyle = PAL.orange; c.lineWidth = 3 * (1 - u) + 0.5;
          ellipsePath(c, 2659, LOW - 68, 14 + u * 50, 10 + u * 36); c.stroke(); c.restore();
        }
      }] });
      const fx = [];
      if (lt > 4.0) fx.push(emit('stamp', cam, 2659, LOW - 68, lt - 4.0, { scaleMul: 0.35 }));
      return { fx };
    },
  },
  { // 镜32 中景：戳戳带着包里的团团躲到花盆后面。门开了
    title: '躲起来', d: 4, grade: GR.DAY,
    sfx: [[0, 'scamper', 0.45, { dur: 1.3 }], [2.0, 'door', 0.7]],
    draw(ctx, lt) {
      const cam = { x: 2580, y: 880, z: 2.0 };
      const pose = (t) => {
        if (t < 1.3) return { x: lerp(2600, 2470, seg(t, 0, 1.3)), y: LOW, flip: -1, walk: t * 18, lean: 0.15, tuanInBag: { eyes: 2, r: 24 } };
        return { x: 2470, y: LOW, flip: 1, sq: 0.8, look: [1, -0.4], tuanInBag: { eyes: 2, r: 24, look: [1, -0.3] }, blink: blinkAt(t, 0.3) };
      };
      const p = rigChuo('s32', lt, pose);
      const open = sseg(lt, 2.0, 3.2) * 0.35;
      street(ctx, cam, { ...SKY.DAY, doorOpen: open, letterInKnot: { stamp: 1 },
        doorInside: (c) => drawGrandpa(c, { x: X.door + 40, y: LOW, s: 0.95, dir: -1, handF: [40, -180] }),
        back: (c) => drawChuo(c, p) });
      return {};
    },
  },
  { // 镜33 近景：老爷爷的手沿着门把摸到绳结，摸到了信
    title: '摸到信', d: 6, grade: GR.DAY,
    sfx: [[0.5, 'doorcreak', 0.25], [2.9, 'rope', 0.45, { dur: 0.6 }], [4.0, 'paper', 0.6], [5.2, 'paper', 0.55]],
    draw(ctx, lt) {
      const cam = { x: 2655, y: LOW - 85, z: 4.6 };
      const hp = keys(lt, [[0, [2720, 875]], [2.0, [2656, 905]], [3.0, [2648, 928]], [4.0, [2650, 944]], [5.0, [2652, 946]], [6.0, [2700, 925]]]);
      const take = seg(lt, 5.0, 6.0);
      street(ctx, cam, { ...SKY.DAY, doorOpen: 0.35, letterInKnot: lt < 5.0 ? { stamp: 1 } : null,
        doorInside: (c) => { c.fillStyle = '#2e2720'; c.fillRect(2500, 700, 400, 400); },
        front: (c) => {
          drawLimb(c, [[2700, 860], [hp[0] + 30, hp[1] - 6], [hp[0], hp[1]]], 30, PAL.cardigan);
          if (lt >= 5.0) drawEnvelope(c, hp[0] - 8, hp[1] + 18, 52, 34, 0.12 + take * 0.3, { stamp: 1 });
          drawHumanHand(c, hp[0], hp[1], 13, Math.PI - 0.3, PAL.skin, { old: true, curl: 0.15 + Math.sin(lt * 3) * 0.08 });
        } });
      return {};
    },
  },
  { // 镜34 特写：拆开信，手指在信纸上停了一下——他读不了。摸到那颗糖，剥开糖纸，一颗橙色的糖躺在掌心
    title: '一颗糖', d: 8, grade: { ...GR.DAY, vig: 0.42 },
    sfx: [[1.5, 'paper', 0.6], [2.5, 'paper', 0.55], [2.9, 'paperbrush', 0.35, { dur: 0.7 }], [4.6, 'candyrattle', 0.6, { dur: 0.5 }], [5.6, 'wrapper', 0.8, { dur: 1.6 }]],
    draw(ctx, lt) {
      // 背景：开衫与门内的暗处（虚化）
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#9c8b70'); g.addColorStop(0.7, '#8a7a62'); g.addColorStop(1, '#3a322a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      mottle(ctx, 0, 0, W, H, '#6f604c', 40, 101, 120, 0.15);
      const ex = 960, ey = 620, ew = 560, eh = 360;
      const tilt = sseg(lt, 4.4, 5.0) * 0.32 * (1 - sseg(lt, 5.4, 5.8));
      const paperOut = sseg(lt, 2.3, 2.9), paperAway = sseg(lt, 4.3, 4.8);
      // 袖子
      drawLimb(ctx, [[300, 1200], [560, 820]], 150, PAL.cardiganDark, 4);
      drawLimb(ctx, [[1650, 1200], [1380, 860]], 150, PAL.cardigan, 4);
      // 信封
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(-0.04 + tilt);
      roundRectPath(ctx, -ew / 2, -eh / 2, ew, eh, 10); fillInk(ctx, '#f3e9d4', 4);
      drawPostmark(ctx, -ew * 0.28, eh * 0.08, 62, PAL.orange, 0.95, 10);
      // 信纸从信封里抽出
      if (paperOut > 0 && paperAway < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-ew / 2 - 100, -eh / 2 - 600, ew + 200, 600 + eh * 0.2); ctx.clip();
        const py = lerp(0, -330, paperOut) + paperAway * 700;
        roundRectPath(ctx, -230, py - 200, 460, 400, 6); fillInk(ctx, '#fbf7ee', 3);
        ctx.strokeStyle = 'rgba(70,60,80,0.7)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        const rr = rng(77);
        for (let l = 0; l < 6; l++) {
          ctx.beginPath();
          let x = -190; const y = py - 140 + l * 52;
          ctx.moveTo(x, y);
          while (x < 170 - (l === 5 ? 160 : 0)) { x += 12 + rr() * 14; ctx.lineTo(x, y + (rr() - 0.5) * 12); }
          ctx.stroke();
        }
        ctx.restore();
      }
      // 翻盖
      const fl = sseg(lt, 1.4, 2.3);
      ctx.beginPath(); ctx.moveTo(-ew / 2 + 6, -eh / 2 + 4); ctx.lineTo(0, -eh / 2 + Math.cos(fl * Math.PI) * eh * 0.5); ctx.lineTo(ew / 2 - 6, -eh / 2 + 4); ctx.closePath();
      fillInk(ctx, fl > 0.5 ? '#ebe0c8' : '#f3e9d4', 3);
      ctx.restore();
      // 糖：从信封口滑到右手掌心
      const slide = seg(lt, 4.6, 5.3);
      const open = sseg(lt, 5.7, 7.1);
      const palm = [1250, 830];
      if (lt > 4.6) drawCandy(ctx, lerp(ex + 160, palm[0], slide), lerp(ey - 200, palm[1] - 40, easeIn(slide)) , 3.2, open);
      // 手
      drawHumanHand(ctx, 610, 700, 80, 0.25, PAL.skinShade, { old: true, curl: 0.55 });
      let rh;
      if (lt < 2.3) rh = [1330, 700, Math.PI + 0.3, 0.55];
      else if (lt < 4.4) { const tr = seg(lt, 2.9, 3.6); rh = [lerp(800, 1080, tr), 470 + Math.sin(tr * 20) * 4 + paperAway * 400, Math.PI * 1.5, 0.1]; }
      else rh = [palm[0], palm[1] + 10, -Math.PI / 2 + 0.2, lerp(0.1, 0.35, open)];
      if (lt > 4.3 && lt < 4.6) rh = [lerp(1080, palm[0], seg(lt, 4.3, 4.6)), lerp(470, palm[1] + 10, seg(lt, 4.3, 4.6)), -Math.PI / 2 + 0.2, 0.2];
      if (lt < 4.4 || lt > 5.3) drawHumanHand(ctx, rh[0], rh[1], 80, rh[2], PAL.skin, { old: true, curl: rh[3] });
      else { drawHumanHand(ctx, rh[0], rh[1], 80, rh[2], PAL.skin, { old: true, curl: rh[3] }); }
      if (lt > 5.3) drawCandy(ctx, palm[0], palm[1] - 40, 3.2, open);
      return { grade: { glow: lt > 6.6 ? 0.35 * sseg(lt, 6.6, 7.4) : 0 }, fx: lt > 7.0 ? [emitScreen('spark', palm[0], palm[1] - 60, lt - 7.0, { scale: 1.3, alpha: 0.6 })] : [] };
    },
  },
  { // 镜35 近景：他把糖凑到鼻子前闻了闻，慢慢笑了，脸转向对街那堵矮墙
    title: '橘子味', d: 6, grade: { ...GR.DAY, side: [-1, 0.3], rays: [0.0, 0.25, 0.3] },
    sfx: [[1.9, 'sniff', 0.55], [3.0, 'sigh', 0.5]],
    draw(ctx, lt) {
      ctx.fillStyle = '#2f2821'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8c7f6c'; ctx.fillRect(1380, 0, 120, H);
      ctx.fillStyle = '#d3c7b3'; ctx.fillRect(1500, 0, W - 1500, H);
      mottle(ctx, 1500, 0, 420, H, '#b0a28a', 20, 111, 60, 0.18);
      const up = sseg(lt, 0.4, 1.8);
      const turn = sseg(lt, 4.2, 5.6);
      const hand = [lerp(60, 44, up), lerp(-150, -266, up)];
      drawGrandpa(ctx, { x: 900, y: 2000, s: 5.0, dir: 1, smile: sseg(lt, 2.4, 4.4), headTurn: -0.7 * turn, headTilt: up * -0.05 + turn * 0.04,
        handF: hand, handFRot: -1.3, curlF: 0.6, itemsTop: (c) => drawCandy(c, hand[0] - 8, hand[1] - 12, 0.42, 2) });
      return {};
    },
  },

  // ---------- 7 第二天清晨 ----------
  { // 镜36 全景：第二天清晨。阿姨推车上坡，矮墙上的搪瓷杯照旧冒着热气
    title: '第二天', d: 5, grade: { ...GR.DAY2, rays: [0.02, 0.15, 0.4] },
    sfx: [[0, 'cart', 0.55, { dur: 4 }], [0, 'sweep', 0.3, { dur: 5 }], [0, 'birds', 0.45, { dur: 5 }]],
    draw(ctx, lt) {
      const cam = { x: 1250, y: 640, z: 0.8 };
      const cartX = lerp(-300, X.cart, easeOut(seg(lt, 0, 4)));
      const ax = cartX - 185, moving = lt < 3.8;
      street(ctx, cam, { ...SKY.DAY2, mug: { steam: 0.25, wrapper: true }, cart: { x: cartX, wheelRot: cartX / 26, broomInCart: true },
        actors: [(c) => drawAuntie(c, { x: ax, y: GROUND, walk: moving ? lt * 6.5 : null, breath: true, handF: moving ? [48, -228] : [36, -150], handB: moving ? [40, -232] : [-30, -150] })] });
      return { fx: [emit('steam', cam, X.mug, WALL_TOP - 58, lt), emit('breath', cam, ax + 38, GROUND - 300, lt, { alpha: 0.6 }), emitScreen('dust', 700, 400, lt, { spread: [1400, 700] })] };
    },
  },
  { // 镜37 近景：木杯盖上压着那张橙色糖纸，叠成一个小小的绳结。阿姨拿起来，愣住
    title: '糖纸结', d: 6, grade: { ...GR.DAY2, side: [1, 0.35] },
    sfx: [[2.1, 'wrapper', 0.45, { dur: 0.4 }]],
    draw(ctx, lt) {
      const cam = { x: X.mug - 6, y: WALL_TOP - 40, z: 5.2 };
      const hp = keys(lt, [[0.5, [1880, 690]], [1.8, [1972, 668]], [2.4, [1970, 660]], [3.4, [1950, 630]], [6, [1950, 628]]]);
      const picked = lt > 2.1;
      street(ctx, cam, { ...SKY.DAY2, mug: { steam: 0.2, wrapper: !picked }, front: (c) => {
        drawLimb(c, [[1915, 720], [hp[0] - 20, hp[1] + 18], [hp[0], hp[1]]], 22, '#949ca2');
        drawHumanHand(c, hp[0], hp[1] + (lt > 3.4 ? Math.sin(lt * 7) * 0.4 : 0), 12, -0.4, PAL.skin, { curl: picked ? 0.5 : 0.2 });
        if (picked) {
          c.save(); c.translate(hp[0] + 12, hp[1] - 10); c.rotate(-0.2); c.scale(1.4, 1.4);
          c.fillStyle = PAL.orange;
          c.beginPath(); c.moveTo(-6, -2); c.lineTo(0, -5); c.lineTo(6, -2); c.lineTo(4, 3); c.lineTo(-4, 3); c.closePath(); c.fill();
          c.strokeStyle = '#b5612a'; c.lineWidth = 0.9; c.stroke();
          c.beginPath(); c.moveTo(-4, 3); c.lineTo(-7, 8); c.moveTo(3, 3); c.lineTo(5, 8); c.strokeStyle = PAL.orange; c.lineWidth = 2; c.stroke();
          c.restore();
        }
      } });
      return { fx: [emit('steam', cam, X.mug, WALL_TOP - 58, lt)] };
    },
  },
  { // 镜38 中景，越过阿姨肩膀：老爷爷坐在敞开的窗边，脸朝着扫帚声的方向，举了举手里的杯子
    title: '隔街举杯', d: 6, grade: { ...GR.DAY2, rays: [0.95, 0.05, 0.35] },
    sfx: [[1.0, 'seagull', 0.55], [0.2, 'music', 0.75, { dur: 19.6 }]],
    draw(ctx, lt) {
      const cam = { x: 2880, y: 790, z: 1.7 };
      const raise = sseg(lt, 2.6, 3.6);
      const h = [lerp(30, 34, raise), lerp(-200, -292, raise)];
      street(ctx, cam, { ...SKY.DAY2, windowOpen: true,
        grandpaWin: grandpaInWindow({ dx: 0, dy: 150, dim: 0.05, dir: -1, headTurn: -0.4, smile: 0.5, handF: h, handB: [-20, -170], itemsTop: (c) => drawMug(c, h[0] - 6, h[1] + 26, 1, { lid: false }) }) });
      // 前景：阿姨的背影（虚焦）
      ctx.save();
      ctx.filter = 'blur(10px)';
      ctx.fillStyle = '#7b8389';
      ellipsePath(ctx, 300, 1180, 420, 380); ctx.fill();
      ctx.fillStyle = '#e1c8ae'; ellipsePath(ctx, 330, 690, 70, 60); ctx.fill();
      ctx.fillStyle = '#9b958c'; ellipsePath(ctx, 300, 560, 200, 190); ctx.fill();
      ctx.fillStyle = '#a9a49a'; ellipsePath(ctx, 320, 470, 215, 120); ctx.fill();
      ctx.restore();
      const [mx, my] = toScreen(cam, X.window + h[0] * 0.9, 900 + 150 + h[1] * 0.9 - 30);
      return { fx: [emitScreen('steam', mx, my, lt, { scale: 1.5, alpha: 0.7 }), emitScreen('dust', 1100, 400, lt, { spread: [1400, 700] })] };
    },
  },
  { // 镜39 近景：阿姨也举起了搪瓷杯。两人都没有动，也没有说话
    title: '也举起杯', d: 4, grade: { ...GR.DAY2, side: [1, 0.4] },
    sfx: [],
    draw(ctx, lt) {
      const cam = { x: 1945, y: 555, z: 2.8 };
      const ax = 1925;
      const r = sseg(lt, 0.7, 2.2);
      const m = [lerp(40, 66, r), lerp(-205, -262, r)];
      street(ctx, cam, { ...SKY.DAY2, actors: [(c) => drawAuntie(c, { x: ax, y: GROUND, headTurn: 0.6, mouth: lt > 2.4 ? 'smile' : null, handF: m, handB: [m[0] - 26, m[1] + 8], itemsMid: mugInHand(m, { lid: false }) })] });
      return { fx: [emit('steam', cam, ax + m[0] - 6, GROUND + m[1] - 22, lt, { alpha: 0.8 })] };
    },
  },
  { // 镜40 中景：邮筒顶上，戳戳和团团并排坐着看。团团的褶皱慢慢松开
    title: '邮筒顶上', d: 5, grade: { ...GR.DAY2, rays: [0.95, 0.0, 0.45] },
    sfx: [[0, 'birds', 0.35, { dur: 5 }]],
    draw(ctx, lt) {
      const cam = { x: 530, y: 520, z: 2.6 };
      const loosen = sseg(lt, 1, 5);
      const p = rigChuo('s40', lt, (t) => ({ x: 490, y: 562, sq: 0.92, look: [1, -0.2], blink: blinkAt(t, 1.5), bag: true }));
      street(ctx, cam, { ...SKY.DAY2, mailboxOpts: {}, actors: [
        (c) => drawChuo(c, { ...p, shadow: false }),
        (c) => drawTuan(c, { x: 580, y: 568, r: 32, eyes: 2, look: [0.6, -0.2], squeeze: lerp(0.4, -0.3, loosen), shadow: false, blink: blinkAt(lt, 2.2) }),
      ] });
      return { fx: [emitScreen('dust', 1200, 300, lt, { spread: [1200, 600] })] };
    },
  },
  { // 镜41 特写：“嚓”，团团展开一角，露出橙色蜡笔画的邮筒。戳戳转头，团团害羞地钻进了包里
    title: '展开一角', d: 5, grade: (lt) => ({ ...GR.DAY2, rays: [0.95, 0.0, 0.4], glow: lt > 1 ? 0.25 : 0 }),
    sfx: [[1.0, 'cha', 1.0], [3.0, 'whoosh', 0.3], [3.45, 'poof', 0.4]],
    draw(ctx, lt) {
      const cam = { x: 545, y: 515, z: 4.8 };
      const unfold = sseg(lt, 1.0, 1.35);
      const hopU = seg(lt, 3.0, 3.45);
      const p = rigChuo('s41', lt, (t) => ({ x: 490, y: 562, sq: 0.92, shadow: false, look: t < 2.0 ? [0.3, -0.5] : [1, 0.3], eyes: t > 2.0 && t < 2.8 ? 'wide' : 'open', blink: blinkAt(t, 0.9),
        tuanInBag: t > 3.45 ? { eyes: 2, look: [-0.4, 0.2], r: 24 } : null, bagStretch: t > 3.45 && t < 3.7 ? [1.1, 0.9] : [1, 1] }));
      street(ctx, cam, { ...SKY.DAY2, actors: [
        (c) => drawChuo(c, p),
        (c) => {
          if (lt < 3.45) {
            const x = lt < 3.0 ? 580 : lerp(580, 540, hopU), y = lt < 3.0 ? 568 : lerp(568, 520, hopU);
            drawTuan(c, { x, y, r: lerp(32, 24, hopU), hop: Math.sin(hopU * Math.PI) * 40, eyes: 2, happy: lt > 2.6, look: lt > 2.2 ? [-0.6, 0.2] : [0.6, -0.2], squeeze: -0.3, unfold: lt < 3.0 ? unfold : 0, shadow: false });
          }
        },
      ] });
      const fx = [];
      if (lt > 1.0) fx.push(emit('paper', cam, 600, 545, lt - 1.0, { scaleMul: 0.3 }));
      return { fx };
    },
  },
  { // 镜42 全景，收：晨光里的街角。投信口里一对豆眼，包口露出两个铅笔点。邮筒底座上那两道粉笔刻痕沐浴着晨光
    title: '收', d: 4, grade: { ...GR.DAY2, rays: [0.9, 0.05, 0.4] },
    sfx: [[2.3, 'bell', 0.7]],
    draw(ctx, lt) {
      const cam = { x: 560, y: 650, z: lerp(1.0, 1.06, lt / 4) };
      street(ctx, cam, { ...SKY.DAY2, chalkGlow: 1, mailboxOpts: { eyes: true, eyesOpen: 1 - blinkAt(lt, 2), tuanDots: true, slotLight: 0.6 } });
      return { fx: [emitScreen('dust', 900, 400, lt, { spread: [1500, 700] })] };
    },
  },
];
