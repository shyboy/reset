// Claude 审片代理：把联系表（42 个镜头的中间帧）和分镜脚本一起交给 Claude，
// 让它逐镜对照“画面是否表达了分镜要求”，输出可执行的修改清单 build/review.md。
// 管线的 review 阶段会调用它（需要 ANTHROPIC_API_KEY 或 `ant auth login`）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sheet = fs.readFileSync(path.join(ROOT, 'build', 'contact_sheet.jpg')).toString('base64');
const storyboard = fs.readFileSync(path.join(ROOT, 'docs', '第1集分镜脚本.md'), 'utf8');
const cues = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'cues.json'), 'utf8'));

const client = new Anthropic();

const system = `你是一部 2D 动画短片的导演助理，负责审片。
画风参照：米纸暖白底、低饱和旧邮筒绿、深铜色点缀、细棕色墨线、水彩纸纹。
主角戳戳（垂耳小生物，歪戴邮差帽，背着比自己大的绿色邮包，右手有圆形邮戳印记）；团团（皱纸团，两颗铅笔点眼睛）。
本集规则：橙色在镜 31 之前完全不出现；全片唯一的文字是镜 7 的片名；不露序幕孩子的脸；老爷爷失明只靠闭眼、摸绳结、盲杖暗示。`;

const prompt = `下面是第 1 集《一杯热水》的分镜脚本，以及按镜号排列的联系表（6×7，每格左上角是镜号，取自该镜头约 60% 处的一帧）。
镜头时间表：${JSON.stringify(cues.shots.map((s) => [s.n, s.start, s.d]))}

请逐镜对照，只列出画面与分镜要求明显不符、或违反本集规则的问题。每条给出：镜号、问题、具体修改建议（构图/动作/颜色）。
最后单独列出“必须修”的前 5 条。用中文 Markdown 输出。

<storyboard>
${storyboard}
</storyboard>`;

const stream = client.beta.messages.stream({
  model: 'claude-opus-5-5',
  max_tokens: 64000,
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high' },
  system,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: sheet } },
      { type: 'text', text: prompt },
    ],
  }],
});

let msg;
try {
  msg = await stream.finalMessage();
} catch (e) {
  if (e instanceof Anthropic.AuthenticationError) console.error('审片跳过：没有可用的 Claude 凭据');
  else if (e instanceof Anthropic.RateLimitError) console.error('审片跳过：触发限流，请稍后重试');
  else if (e instanceof Anthropic.APIError) console.error(`审片失败：API ${e.status} ${e.message}`);
  else throw e;
  process.exit(0);
}
if (msg.stop_reason === 'refusal') {
  console.error('审片被拒绝：', msg.stop_details?.category ?? '');
  process.exit(0);
}
const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
const out = path.join(ROOT, 'build', 'review.md');
fs.writeFileSync(out, `# 第1集 审片意见（Claude）\n\n${text}\n`);
console.log(`审片意见写入 ${path.relative(ROOT, out)}（模型 ${msg.model}）`);
