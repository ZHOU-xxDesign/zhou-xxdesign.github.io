/* 项目数据 —— 作品台、黑胶卡片、静态标记生成器共用这一份。
 *
 * accent：项目身份色，取各自封面的**点缀色**（不是主色）。
 *   实测六张里有四张同属蓝色系（216° / 222° / 245° / 264°，相邻只差 4°/19°/24°），
 *   光靠颜色区分不了项目，所以颜色圆点下面都带编号。
 *
 * title 用于作品台的标题和药丸；meta 是「角色 · 年份」那一行。
 */
window.VINYL_PROJECTS = {
  projects: [
    {
      index: "001",
      slug: "magiclab",
      title: "魔法原子 · MagicBot App 改版",
      meta: "机器人移动端 / 网页端 · 2026 — 至今",
      accent: "#6308d4",
      href: "/work/magiclab/",
      alt: "魔法原子 MagicBot 系列机器人",
    },
    {
      index: "002",
      slug: "design-system",
      title: "Magic Design System 1.0",
      meta: "设计系统 / 组件库 · 2026",
      accent: "#eef2f4",
      href: "/work/design-system/",
      alt: "Magic Design System 1.0",
    },
    {
      index: "003",
      slug: "agibot",
      title: "智元机器人 · AgiBot App",
      meta: "机器人移动端 / 表情设计 · 2024 — 2026",
      accent: "#fb5032",
      href: "/work/agibot/",
      alt: "智元机器人 AGIBOT X2 操控界面",
    },
    {
      index: "004",
      slug: "jidu",
      title: "集度 · JIDU 数字座舱",
      meta: "车机 HMI / 导航 · 2022 — 2024",
      accent: "#000000",
      href: "/work/jidu/",
      alt: "集度 ROBOCAR 数字座舱",
    },
    {
      index: "005",
      slug: "lenovo",
      title: "联想 · 乐云 LeCloud 3.0",
      meta: "多端产品设计 · 实习 · 2021 — 2022",
      accent: "#08dedc",
      href: "/work/lenovo/",
      alt: "联想乐云 LeCloud 3.0",
    },
    {
      index: "006",
      slug: "explore",
      title: "探索 · 3D 与 AIGC",
      meta: "3D 渲染 / AIGC · 2023 — 至今",
      accent: "#f6dfad",
      href: "/work/explore/",
      alt: "3D 渲染与 AIGC 探索作品",
    },
  ],
};
