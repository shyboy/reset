# 风坡镇 · 第 1 集《一杯热水》

3 分 30 秒、42 个镜头的程序化 2D 动画。角色与画风依照设定稿（戳戳、团团三视图与配色），故事与镜头严格按 `docs/第1集分镜脚本.md`。成片：`build/ep01_一杯热水.mp4`（1920×1080，60 fps，AAC 立体声）。

## 技术结构

```
Canvas2D 手绘层 ──► Three.js / WebGL2 ──► GLSL 后期 ──► 离线逐帧抓取 ──► ffmpeg
 (角色、场景)       (纹理 + GPU 粒子)    (水彩/调色/光)   (多进程、确定性)   (分段编码 + 混音)
```

| 层 | 文件 | 说明 |
|---|---|---|
| 手绘层 | `src/core.js` `src/chars.js` `src/world.js` | 带抖动的墨线、体积填充、斑驳纹理。戳戳/团团/阿姨/老爷爷/孩子全部是参数化矢量角色；风坡镇街角是一个可平移缩放的世界，静态背景按镜头缓存 |
| 骨骼 | `src/rig.js` | 骨骼层级 + FK、CCD IK、解析两骨骼 IK（人物手臂与腿）；耳朵、铜铃、邮包、纸团形变用**确定性弹簧**做次级运动：固定步长从镜头起点积分，任意一帧只取决于（镜头，镜头内时间），所以多进程分片渲染结果一致 |
| GPU | `src/gpu.js` | Three.js `WebGLRenderer`。手绘层作为 `CanvasTexture`；**无状态 GPU 粒子**（滴水、热气、白气、浮尘、海风、盖戳光点、纸屑、雾）的位置全部在顶点着色器里由时间和种子算出，可任意跳帧 |
| GLSL 后期 | `src/gpu.js` `POST_FRAG` | 线条 boil（每秒 8 次）、景深（横带/径向）、水彩边缘沉积与颜料颗粒、亮部柔光、体积光、按镜头调色（序幕冷灰蓝 → 白天暖灰 → 第二天侧光）、程序化纸纹、暗角、胶片颗粒；运动模糊用快门内子帧累积（`--samples`） |
| 分镜 | `src/shots1.js` `src/shots2.js` | 42 个镜头，每个镜头返回画面、粒子发射器、调色，并声明音效提示 `sfx` |
| 声音 | `audio/synth.py` | 只用 numpy：海浪/风/鸟的声床，70 种拟音合成器（纸团“咔啦”、铜铃“叮”、盖戳“咚”、展开“嚓”…），片名动机与镜 38–41 的配乐；“咚”“嚓”前后自动压低声床留出安静 |
| 管线 | `tools/pipeline.mjs` | `lint → cues → stills → review → frames → audio → mux → qa` |
| 审片代理 | `agent/review.mjs` | 把联系表和分镜脚本交给 Claude（`claude-opus-5-5`）逐镜审片，输出 `build/review.md` |

> 关于 WebGPU：渲染器选的是 WebGL2。无头 Chromium 在本环境没有 WebGPU 适配器（`navigator.gpu.requestAdapter()` 为空），WebGL2 由 SwiftShader 提供，所以着色器写成 GLSL。

## 使用

```bash
npm install
```

```bash
node tools/pipeline.mjs
```

常用参数：`--only=stills`（只出联系表）、`--fps=60`、`--w=1920`、`--workers=4`、`--samples=4`（运动模糊）、`--from=100 --to=120`（只渲一段）。

浏览器预览（实时播放，带音轨）：

```bash
node -e "import('./tools/lib.mjs').then(async m => { const {url} = await m.serve(8080); console.log(url + '/index.html'); })"
```

## 本集的几条规则在代码里的落点

- 橙色只在镜 31 之后出现：`PAL.orange` 只被盖戳、糖、糖纸、团团展开的一角使用；戳戳手上的旧印记是赭红 `PAL.stampMark`，盖戳那一下才短暂变橙。
- 全片唯一的文字是镜 7 片名（`assets/title-font.ttf`，马善政楷体子集，SIL OFL）。
- 序幕孩子不露脸：孩子的头部永远在裁剪区域之外。
- 两道粉笔身高刻痕在邮筒底座剥漆处，只在镜 6 与镜 42 的画面角落出现，镜 42 加一层晨光。
- 老爷爷失明只靠闭眼、摸绳结、盲杖三处暗示。
