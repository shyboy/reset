// 时间轴与渲染入口
'use strict';

// SHOTS 由 shots.js 定义：[{n, d, draw(ctx, lt, d) -> {fx, grade?}, grade, shake, fadeOut}]
const TIMELINE = (() => {
  let t = 0;
  return SHOTS.map((s, i) => { const o = { ...s, n: i + 1, start: t }; t += s.d; return o; });
})();
const DURATION = TIMELINE.reduce((a, s) => a + s.d, 0);

function shotAt(t) {
  for (let i = TIMELINE.length - 1; i >= 0; i--) if (t >= TIMELINE[i].start) return TIMELINE[i];
  return TIMELINE[0];
}

// 世界坐标 -> 屏幕坐标（给 GPU 粒子定位）
function toScreen(cam, x, y) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }

// 无 WebGL 时的 Canvas2D 调色回退
function grade2D(ctx, g) {
  if (!g) return;
  const tint = g.tint ?? [1, 1, 1];
  const hex = '#' + tint.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('');
  grade(ctx, { desat: clamp(1 - (g.sat ?? 1)), mult: hex, multA: g.tintAmt ?? 0, sideLight: g.side ? g.side[1] : 0, sideDir: g.side ? g.side[0] : 1 });
}

// 绘制手绘层；opts.gpu=true 时把调色、暗角、淡入淡出交给 GLSL，返回元数据
function renderFrame(ctx, t, opts = {}) {
  G.t = t;
  G.boil = Math.floor(t * 8) % 3;
  const shot = shotAt(Math.min(t, DURATION - 1e-6));
  const lt = t - shot.start;
  const sx = ctx.canvas.width / W;
  ctx.setTransform(sx, 0, 0, sx, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shot.shake) {
    const k = shot.shake(lt);
    if (k > 0) ctx.translate(noise1(t * 30, 1) * 8 * k, noise1(t * 30, 2) * 6 * k);
  }
  const res = shot.draw(ctx, lt, shot.d) || {};
  ctx.restore();
  ctx.setTransform(sx, 0, 0, sx, 0, 0);
  const g = { ...(typeof shot.grade === 'function' ? shot.grade(lt) : shot.grade), ...(res.grade || {}) };
  let fade = 0;
  if (t < 1.2) fade = 1 - t / 1.2;
  if (shot.fadeOut) fade = Math.max(fade, shot.fadeOut(lt));
  if (shot.fadeIn) fade = Math.max(fade, shot.fadeIn(lt));
  if (t > DURATION - 1.4) fade = Math.max(fade, (t - (DURATION - 1.4)) / 1.2);
  fade = clamp(fade);
  if (!opts.gpu) {
    grade2D(ctx, g);
    paperOverlay(ctx, shot.paper ?? 1);
    vignette(ctx, g.vig ?? 0.32);
    blackout(ctx, fade);
  }
  return { t, shot: shot.n, lt, grade: g, fx: res.fx || [], fade };
}

// 导出音效提示表（音频合成器读取）
function cueSheet() {
  const cues = [];
  for (const s of TIMELINE) for (const c of s.sfx || []) cues.push({ t: +(s.start + c[0]).toFixed(3), name: c[1], gain: c[2] ?? 1, shot: s.n, ...(c[3] || {}) });
  return { duration: DURATION, shots: TIMELINE.map((s) => ({ n: s.n, start: s.start, d: s.d, title: s.title })), cues };
}

window.EP = { W, H, DURATION, TIMELINE, renderFrame, cueSheet };
