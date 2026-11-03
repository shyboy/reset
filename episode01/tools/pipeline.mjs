// 自动化制作管线（Agentic Workflow）
//
//   lint    校验时间轴：42 个镜头、总长 3:30、每个镜头都有画面函数
//   cues    从时间轴导出音效提示表 build/cues.json（画面与声音同一个数据源）
//   stills  每个镜头取中间帧，拼成联系表 build/contact_sheet.jpg（供人或 Claude 审片）
//   review  （可选）把联系表 + 分镜脚本交给 Claude 审片，输出 build/review.md
//   frames  多进程离线渲染：每个 worker 负责一段帧区间，直接以管道喂给 ffmpeg 编码成分段
//   audio   python 合成声音（环境声、拟音、配乐动机）→ build/ep01_audio.wav
//   mux     拼接视频分段 + 混入音轨 → build/ep01_一杯热水.mp4
//   qa      ffprobe 时长/帧率检查、黑场检测、响度测量 → build/qa.json
//
// 用法：node tools/pipeline.mjs [--only=lint,cues,...] [--fps=60] [--w=1920] [--workers=4] [--samples=1] [--from=0 --to=210]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { serve, launch, openPage, grab, ROOT } from './lib.mjs';

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const STAGES = (flags.only ? String(flags.only).split(',') : ['lint', 'cues', 'stills', 'review', 'frames', 'audio', 'mux', 'qa']);
const FPS = +(flags.fps ?? 60), WIDTH = +(flags.w ?? 1920), WORKERS = +(flags.workers ?? 4), SAMPLES = +(flags.samples ?? 1);
const BUILD = path.join(ROOT, 'build');
const SEG = path.join(BUILD, 'segments');
fs.mkdirSync(SEG, { recursive: true });

const log = (stage, ...m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${stage.padEnd(6)}`, ...m);
const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr}`);
  return r;
};

const { srv, url } = await serve();
let timeline = null;
async function getTimeline() {
  if (timeline) return timeline;
  const b = await launch();
  const p = await openPage(b, url, { width: 480 });
  timeline = await p.evaluate(() => cueSheet());
  await b.close();
  return timeline;
}

const stages = {
  async lint() {
    const tl = await getTimeline();
    const problems = [];
    if (tl.shots.length !== 42) problems.push(`镜头数 ${tl.shots.length} ≠ 42`);
    if (Math.abs(tl.duration - 210) > 1e-6) problems.push(`总时长 ${tl.duration}s ≠ 210s`);
    for (const c of tl.cues) if (c.t < 0 || c.t > tl.duration) problems.push(`音效越界 ${c.name}@${c.t}`);
    if (problems.length) throw new Error(problems.join('\n'));
    log('lint', `OK：${tl.shots.length} 个镜头，${tl.duration}s，${tl.cues.length} 条音效提示`);
  },

  async cues() {
    const tl = await getTimeline();
    fs.writeFileSync(path.join(BUILD, 'cues.json'), JSON.stringify(tl, null, 1));
    log('cues', `build/cues.json（${tl.cues.length} 条）`);
  },

  async stills() {
    const tl = await getTimeline();
    const dir = path.join(BUILD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const b = await launch();
    const p = await openPage(b, url, { width: 640 });
    for (const s of tl.shots) {
      const t = s.start + s.d * (s.n === 7 ? 0.5 : 0.62);
      fs.writeFileSync(path.join(dir, `shot${String(s.n).padStart(2, '0')}.jpg`), await grab(p, t, { quality: 0.85 }));
    }
    await b.close();
    // 6×7 联系表，每格标镜号
    const inputs = tl.shots.map((s) => path.join(dir, `shot${String(s.n).padStart(2, '0')}.jpg`));
    const listFile = path.join(dir, 'list.txt');
    fs.writeFileSync(listFile, inputs.map((f) => `file '${f}'`).join('\n'));
    sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
      '-vf', "scale=320:180,drawtext=fontfile=/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc:text='%{eif\\:n+1\\:d}':x=6:y=4:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=6x7:padding=4:color=0x1b1714",
      '-frames:v', '1', path.join(BUILD, 'contact_sheet.jpg')]);
    log('stills', 'build/contact_sheet.jpg');
  },

  async review() {
    if (!process.env.ANTHROPIC_API_KEY) { log('review', '跳过：未设置 ANTHROPIC_API_KEY'); return; }
    sh('node', [path.join(ROOT, 'agent', 'review.mjs')], { stdio: 'inherit' });
  },

  async frames() {
    const tl = await getTimeline();
    const from = +(flags.from ?? 0), to = +(flags.to ?? tl.duration);
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
    const total = f1 - f0;
    const per = Math.ceil(total / WORKERS);
    log('frames', `${total} 帧 @ ${FPS}fps，${WIDTH}px，${WORKERS} 个进程，运动模糊子帧 ${SAMPLES}`);
    const t0 = Date.now();
    const done = new Array(WORKERS).fill(0);
    const progress = setInterval(() => {
      const n = done.reduce((a, b) => a + b, 0), el = (Date.now() - t0) / 1000;
      log('frames', `${n}/${total} (${(n / total * 100).toFixed(1)}%)，${(n / el).toFixed(2)} 帧/秒，剩余约 ${Math.round((total - n) / Math.max(n / el, 1e-3) / 60)} 分钟`);
    }, 30000);
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = f0 + w * per, z = Math.min(f1, a + per);
      if (a >= z) return;
      const segFile = path.join(SEG, `seg_${String(w).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), segFile], { stdio: ['pipe', 'inherit', 'inherit'] });
      const b = await launch();
      const p = await openPage(b, url, { width: WIDTH });
      for (let f = a; f < z; f++) {
        const buf = await grab(p, f / FPS, { samples: SAMPLES, fps: FPS, quality: 0.95 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done[w]++;
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      await b.close();
    }));
    clearInterval(progress);
    const segs = fs.readdirSync(SEG).filter((f) => f.endsWith('.mp4')).sort();
    fs.writeFileSync(path.join(SEG, 'list.txt'), segs.map((f) => `file '${path.join(SEG, f)}'`).join('\n'));
    log('frames', `完成，用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分钟`);
  },

  async audio() {
    if (!fs.existsSync(path.join(BUILD, 'cues.json'))) await stages.cues();
    sh('python3', [path.join(ROOT, 'audio', 'synth.py'), path.join(BUILD, 'cues.json'), path.join(BUILD, 'ep01_audio.wav')], { stdio: 'inherit' });
    log('audio', 'build/ep01_audio.wav');
  },

  async mux() {
    const out = path.join(BUILD, 'ep01_一杯热水.mp4');
    sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(SEG, 'list.txt'), '-i', path.join(BUILD, 'ep01_audio.wav'),
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      '-metadata', 'title=一杯热水', '-metadata', 'comment=风坡镇 第1集', out]);
    log('mux', path.relative(ROOT, out));
  },

  async qa() {
    const out = path.join(BUILD, 'ep01_一杯热水.mp4');
    const probe = JSON.parse(sh('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', out]).stdout);
    const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
    const black = sh('ffmpeg', ['-hide_banner', '-i', out, '-vf', 'blackdetect=d=0.5:pix_th=0.12', '-an', '-f', 'null', '-']).stderr
      .split('\n').filter((l) => l.includes('black_start')).map((l) => l.replace(/.*black_start/, 'black_start').trim());
    const loud = sh('ffmpeg', ['-hide_banner', '-i', out, '-vn', '-af', 'ebur128', '-f', 'null', '-']).stderr;
    const I = (loud.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop();
    const report = {
      duration: +probe.format.duration, size_mb: +(probe.format.size / 1e6).toFixed(1),
      video: { codec: v.codec_name, w: v.width, h: v.height, fps: v.r_frame_rate, frames: +v.nb_frames },
      audio: a ? { codec: a.codec_name, rate: a.sample_rate, ch: a.channels } : null,
      loudness: I, black_segments: black,
      checks: {
        duration_ok: Math.abs(+probe.format.duration - 210) < 0.2,
        // 预期的黑场只在片头淡入和片尾黑场
        black_only_at_edges: black.every((l) => { const s = +l.match(/black_start:([\d.]+)/)[1]; return s < 1.5 || s > 207; }),
      },
    };
    fs.writeFileSync(path.join(BUILD, 'qa.json'), JSON.stringify(report, null, 2));
    log('qa', JSON.stringify(report));
  },
};

try {
  for (const s of STAGES) { log(s, '开始'); await stages[s](); }
} finally { srv.close(); }
