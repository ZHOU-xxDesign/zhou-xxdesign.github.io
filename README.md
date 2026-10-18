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
├── index.html          # 首页 —— Hero / 作品 / 关于 / 经历 / 联系
├── styles.css          # 首页样式（含设计变量、响应式、动画）
├── work.css            # 项目详情页样式（依赖 styles.css 的变量）
├── main.js             # 两个小交互：页脚年份、卡片滚动渐入
├── work/               # 6 个项目详情页
│   ├── magiclab/index.html
│   ├── design-system/index.html
│   ├── agibot/index.html
│   ├── jidu/index.html
│   ├── lenovo/index.html
│   └── explore/index.html
└── assets/images/
    ├── *.jpg           # 首页用图
    └── work/*.jpg      # 详情页用图
```

> 详情页放在 `work/<slug>/index.html`，GitHub Pages 会以 `/work/<slug>/` 提供。
> 所有页面统一用**根相对路径**（`/styles.css`、`/assets/...`），因为这是用户站点，始终在域名根目录。

## 项目详情页

每个项目一个独立页面，结构统一：

| 区块 | 说明 |
|---|---|
| 返回条 | 「全部作品」+ 序号 `(00N / 006)` |
| Hero | 标题 / 一句话概述 / 四格元信息（Time · Role · Scope · Output） |
| 首图 | 项目主视觉 |
| 数据条 | 3 个关键数字（可选） |
| `case__section` | 左栏等宽小标签 + 右栏正文，可含 `case__points` 编号要点 |
| `case__figure` | 配图 + 等宽图注（`Fig. 01`） |
| 下一个项目 | 循环跳转，最后一个回到第一个 |

### 加一个项目详情页

1. 新建 `work/<slug>/index.html`，复制任意现有详情页改内容（结构保持一致）
2. 配图放进 `assets/images/work/`，命名 `<slug>-01.jpg` 递增
3. 在 `index.html` 里加一张卡片，`href` 指向 `/work/<slug>/`
4. 改所有详情页的 `case__index` 序号和 `case__next` 链，形成闭环

### 详情页可用的样式类

`case__meta`（元信息栅格）· `case__stats` / `case__stat`（数据条）· `case__quote`（手写体金句）·
`case__points` + `case__points--2` / `--3` + `case__point`（编号要点）· `case__figures` / `case__figure`（配图组）

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
在 `index.html` 里复制任意一个 `<article class="card">` 整块，改四处：

1. `<a class="card__link" href="/work/<slug>/">` 指向新的详情页
2. `<img src="...">` 换成新图（放进 `assets/images/`，建议宽 1600px、JPG 质量 82）
3. `<h2 class="card__title">` 改成项目名
4. 两处元信息（`card__meta` 和 `card__meta-inline`）里的 Time / Project / Introduction 保持一致

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

## 版本管理与发布

### 分支策略

只有 `main` 一个长期分支，**`main` 即生产**。推送到 `main` 后 GitHub Pages 自动构建发布，不需要额外的 CI。

改一个小地方不想立刻上线时，开临时分支，满意了再合并：

```bash
git switch -c fix/hero-spacing     # 开分支
# ...改东西...
git add -A && git commit -m "fix: 修正首屏标题间距"
git switch main && git merge fix/hero-spacing
git push origin main
git branch -d fix/hero-spacing
```

### 提交信息约定

用 `类型: 简述` 的格式，方便回看历史时一眼分清改动性质：

| 类型 | 用途 | 例子 |
|---|---|---|
| `feat` | 新增页面、区块、功能 | `feat: 新增论文页面` |
| `fix` | 修 bug、排版问题 | `fix: 移动端联系区邮箱溢出` |
| `content` | 只改文案、换图 | `content: 更新集度项目的成果数据` |
| `style` | 只改样式，不改结构 | `style: 作品卡片悬停加箭头` |
| `docs` | README / CHANGELOG | `docs: 补充详情页新增步骤` |
| `chore` | 版本管理、配置 | `chore: 更新 .gitignore` |

### 标签（版本）

每次内容或结构上有意义的节点打一个标签，方便随时回退到某个已知good的状态：

```bash
git tag -a v1.2.0 -m "新增论文页面"     # 打标签（-a 是带说明的标签）
git push origin v1.2.0                  # 标签要单独推送
git tag -l                              # 查看所有标签
```

版本号怎么升，见 `CHANGELOG.md` 顶部的说明。

### 回滚

```bash
# 方案 A：撤销某次提交的改动，保留后续提交（安全，推荐）
git revert <commit-hash>
git push origin main

# 方案 B：临时看一眼某个旧版本（不动 main）
git switch --detach v1.0.0

# 方案 C：把 main 整体退回某个标签（会改写历史，慎用）
git reset --hard v1.0.0
git push --force-with-lease origin main
```

线上出问题时，也可以在 GitHub 仓库的 **Actions / Deployments** 里看到每次部署记录；
如果要紧急下线，在 **Settings → Pages** 里把 Source 改成 `None` 即可。

### 提交前自检

```bash
git status                 # 确认没有意外文件
git diff --cached          # 看一遍将要提交的内容
```

`.gitignore` 已经把 `mydata/`、`*.pdf`、`.DS_Store` 排除在外——
**简历和作品集原始 PDF 绝不能进这个仓库**，否则会随 GitHub Pages 一起公开。

## 部署

推送到 `main` 即可，GitHub Pages 会自动构建：

```bash
git add -A
git commit -m "content: 更新作品集内容"
git push origin main
```

首次部署需要在仓库 **Settings → Pages** 里确认 Source 为 `Deploy from a branch`，分支选 `main` / `root`。

## 内容来源

- 作品集 PDF（50 页）——项目内容与配图
- 简历 PDF —— 联系方式、教育与工作经历
- 原始 React 版设计（浏览器窗口外框 / 手写标题 / 等宽标签）已重建为上述纯静态源码，可自由编辑

> 注：作品集 PDF 中红点奖页写的是 **2023**（证书标注 Red Dot Winner 2023），而简历里写的是 2022。本站采用 **2023**。若简历需要更正，请同步修改。
