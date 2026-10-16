# zhou-xxdesign.github.io

周晓旭（Zhou Xiaoxu）的个人作品集主页。

纯静态站：**零依赖、无构建步骤**，改完存盘刷新即可生效。推送到 `main` 分支后由 GitHub Pages 自动发布。

线上地址：https://zhou-xxdesign.github.io

## 本地预览

```bash
cd zhou-xxdesign.github.io
python3 -m http.server 8000
```

打开 http://127.0.0.1:8000

> 直接双击 `index.html` 也能看，但用本地服务更接近线上环境（字体加载、相对路径行为一致）。

## 文件结构

```
.
├── index.html      # 页面内容 —— 所有文案都在这里
├── styles.css      # 全部样式（含设计变量、响应式、动画）
├── main.js         # 两个小交互：页脚年份、卡片滚动渐入
└── assets/images/  # 图片资源
```

## 设计语言

| 元素 | 说明 |
|---|---|
| 底色 / 文字 | 纯白 `#fff` / 纯黑 `#000` |
| 顶部 | 浏览器窗口外框（三个圆点 + 标签页 + 地址栏） |
| 主标题 | Caveat 手写体，斜切 `skewX(-6deg)`，配闪烁光标 |
| 小标签 | Space Mono 等宽大写，字距 `0.3em`–`0.4em` |
| 正文 | Inter |
| 项目图 | 宽屏默认灰度，悬停转彩色并浮出元信息 |
| 分隔 | 1px 细线，`#f3f4f6` |

三个字体族定义在 `styles.css` 顶部的 `--font-hand` / `--font-body` / `--font-mono`。

## 常见修改

### 改文案
全部在 `index.html` 里，按区块从上到下排列：Hero → 作品 → 关于 → 经历 → 联系。

### 加一个作品
复制任意一个 `<article class="card">` 整块，改三处：

1. `<img src="...">` 换成新图（放进 `assets/images/`，建议宽 1600px、JPG 质量 82）
2. `<h2 class="card__title">` 改成项目名
3. 两处元信息（`card__meta` 和 `card__meta-inline`）里的 Time / Project / Introduction 保持一致

> `card__meta` 是宽屏悬停浮层，`card__meta-inline` 是窄屏静态展示——**两处都要改**，内容必须相同。
>
> 加完记得把 `works__count` 的 `(001 — 006)` 改成新的编号范围。

### 改颜色 / 间距
`styles.css` 顶部的 `:root` 变量块。改一处全局生效。

### 断点
`768px`（平板）和 `1024px`（桌面）。移动端样式集中在各区块末尾的 media query 里。

## 响应式与无障碍

- 320px 到 1920px+ 全区间无横向溢出（大邮箱用 `clamp(1.5rem, 11.5vw, 12rem)` 控制，Space Mono 单字宽约 0.6em）
- 触屏 / 窄屏：项目元信息改为静态展示，图片保持彩色（因为没有 hover）
- 尊重 `prefers-reduced-motion`，开启后关闭所有动效
- 卡片渐入只在 JS 可用时生效（`html.js` 门控），JS 加载失败不会白屏
- 键盘可达：跳转链接、`:focus-visible` 描边

## 部署

推送到 `main` 即可，GitHub Pages 会自动构建：

```bash
git add -A
git commit -m "更新作品集内容"
git push origin main
```

首次部署需要在仓库 **Settings → Pages** 里确认 Source 为 `Deploy from a branch`，分支选 `main` / `root`。

## 内容来源

- 作品集 PDF（50 页）——项目内容与配图
- 简历 PDF —— 联系方式、教育与工作经历
- 原始 React 版设计（浏览器窗口外框 / 手写标题 / 等宽标签）已重建为上述纯静态源码，可自由编辑

> 注：作品集 PDF 中红点奖页写的是 **2023**（证书标注 Red Dot Winner 2023），而简历里写的是 2022。本站采用 **2023**。若简历需要更正，请同步修改。
