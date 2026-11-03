// 快速出静帧：node tools/stills.mjs <out_dir> <t1> <t2> ...   （可加 --w=960 --nogpu）
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openPage, grab } from './lib.mjs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [out, ...ts] = args.filter((a) => !a.startsWith('--'));
fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve();
const browser = await launch();
const page = await openPage(browser, url, { width: +(flags.w ?? 960), query: flags.nogpu ? '&nogpu' : '' });
console.log('mode:', await page.evaluate(() => window.GPU_MODE));
for (const t of ts) {
  const t0 = Date.now();
  const buf = await grab(page, +t, { samples: +(flags.samples ?? 1) });
  fs.writeFileSync(path.join(out, `t${String(t).replace('.', '_')}.jpg`), buf);
  console.log(t, `${Date.now() - t0}ms`);
}
await browser.close(); srv.close();
