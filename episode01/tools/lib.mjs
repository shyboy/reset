// 管线共用：静态服务器 + 无头浏览器页面
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

export function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

export async function launch() {
  const { chromium } = require('playwright');
  // SwiftShader 提供无 GPU 环境下的 WebGL2
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

export async function openPage(browser, url, { width = 1920, query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(`${url}/index.html?render&w=${width}${query}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

// 渲染一帧并取回 JPEG（Buffer）
export async function grab(page, t, { samples = 1, fps = 60, quality = 0.92 } = {}) {
  const b64 = await page.evaluate(({ t, samples, fps, quality }) => {
    renderAt(t, samples, fps);
    return document.getElementById(window.GPU_MODE === 'webgl2' ? 'out' : 'out').toDataURL('image/jpeg', quality).split(',')[1];
  }, { t, samples, fps, quality });
  return Buffer.from(b64, 'base64');
}
