/* ==========================================================================
   周晓旭 · Portfolio — intro.js
   开场序列（约 6.7s，每个标签页只播一次）：
     1. 打印机从下方淡入
     2. hello. / i'm zoya. 逐字打在纸上，纸同时不断向上长
     3. 整张纸放大到铺满视口，打印机淡出
     4. 停留 0.6s（光标闪）
     5. 淡出，露出原来的首屏（hero 的入场动画这时才开始）

   参数：?intro=1 强制播放 · ?intro=0 跳过 · ?introAt=3400 定格某一帧（调试用）
   全部运动走 rAF 写内联样式，不用 CSS transition。
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  const el = document.querySelector("[data-intro]");
  if (!el) return;

  /* 头部内联脚本已经判断过要不要播；没加 is-intro 就直接收起来 */
  if (!root.classList.contains("is-intro")) {
    el.hidden = true;
    return;
  }

  const paper = el.querySelector("[data-intro-paper]");
  const body = el.querySelector("[data-intro-body]");
  const machine = el.querySelector("[data-intro-machine]");
  const wash = el.querySelector("[data-intro-wash]");
  const head = el.querySelector(".intro__head");
  const skipBtn = el.querySelector("[data-intro-skip]");
  const lineEls = Array.from(el.querySelectorAll("[data-intro-line]"));

  /* ---------- 文案与节奏 ---------------------------------------------- */

  const LINES = [
    { text: "hello.", ch: 118 },
    { text: "i'm zoya.", ch: 90, gap: 420 },
  ];

  const T_START = 420;      // 打印机入场后开始打
  const CHAR_IN = 120;      // 单字"落"下来的时长
  const TYPE_TAIL = 280;    // 打完最后一个字后的停顿
  const ZOOM_MS = 1050;
  const HOLD_MS = 600;
  const OUT_MS = 400;
  const H0 = 0.76;          // 纸的起始高度（占满高比例）

  /* 逐字的时刻表 */
  const steps = [];
  let clock = T_START;
  LINES.forEach((line, li) => {
    if (li) clock += line.gap;
    for (let i = 0; i < line.text.length; i++) {
      steps.push({ li, i, at: clock });
      clock += line.ch;
    }
  });

  const TYPE_END = steps[steps.length - 1].at + TYPE_TAIL;
  const ZOOM_START = TYPE_END + 260;
  const OUT_START = ZOOM_START + ZOOM_MS + HOLD_MS;
  const END = OUT_START + OUT_MS;

  /* ---------- 建字 ------------------------------------------------------ */

  const hash = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const chars = steps.map((step, k) => {
    const node = document.createElement("span");
    node.className = "intro__ch";
    node.textContent =
      LINES[step.li].text[step.i] === " " ? "\u00a0" : LINES[step.li].text[step.i];
    node.style.display = "none";   // 未打的字不占位，光标才会跟着走
    node.dataset.jit = String((hash(k * 3 + 1) - 0.5) * 1.7);   // 落字时的纵向偏差
    node.dataset.rot = String((hash(k * 5 + 2) - 0.5) * 2.4);
    lineEls[step.li].appendChild(node);
    return { node, at: step.at, li: step.li, shown: false };
  });

  /* 键帽：每打一个字，随机（但固定）按下一颗，跟着打字一起动 */
  const keys = Array.from(el.querySelectorAll(".tw__keys circle"));
  const presses = keys.length
    ? steps.map((step, i) => {
        const code = LINES[step.li].text[step.i].charCodeAt(0);
        return {
          at: step.at - 30,                       // 键先按下，字再落纸
          node: keys[(code * 37 + i * 11) % keys.length],
          amt: 0,
        };
      })
    : [];

  const carets = lineEls.map((line) => {
    const c = document.createElement("span");
    c.className = "intro__caret";
    line.appendChild(c);
    return c;
  });

  /* ---------- 度量 ------------------------------------------------------ */

  let paperH = 0;
  let zoom = null;
  let lastH = "";

  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
  const easeOut = (n) => 1 - Math.pow(1 - n, 3);
  const easeInOut = (n) => (n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2);

  const measure = () => {
    // 读 CSS 里的 --ph（此时还没有内联高度）
    paper.style.height = "";
    paperH = parseFloat(getComputedStyle(paper).height) || 0;
    if (!paperH) {
      const stage = el.querySelector(".intro__stage");
      const pw = parseFloat(getComputedStyle(stage).width) || 300;
      paperH = pw * 1.3;
    }
  };

  const zoomTarget = () => {
    const r = paper.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const s = Math.max(vw / r.width, vh / r.height) * 1.015;
    const pcx = r.left + r.width / 2;
    const pcy = r.top + r.height / 2;
    const bcy = b.top + b.height / 2;

    return {
      s,
      tx: vw / 2 - pcx,
      ty: vh / 2 - pcy,
      // 字块中心相对纸中心的偏移（正数 = 在纸中心下方），满屏时抵消掉
      lift: Math.max(0, bcy - pcy),
      shift: pcx - (b.left + b.width / 2),
      // 竖屏手机上按高度铺满会把字撑出屏幕，这里把字单独缩回来
      k: Math.min(1, (vw * 0.84) / (b.width * s)),
    };
  };

  /* ---------- 逐帧 ------------------------------------------------------ */

  function render(t) {
    /* 1. 纸：一边打字一边向上长（底边固定，顶端往上走） */
    const feed = clamp01((t - T_START) / Math.max(1, TYPE_END - T_START));
    const feedE = feed * (0.8 + 0.2 * feed);
    // 只在数值变了才写，避免打字结束后还每帧强制重排
    const hh = ((H0 + (1 - H0) * feedE) * paperH).toFixed(1) + "px";
    if (hh !== lastH) {
      paper.style.height = hh;
      lastH = hh;
    }

    /* 2. 逐字落下 */
    let activeLine = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (t < c.at) {
        if (c.shown) {
          c.node.style.display = "none";
          c.shown = false;
        }
        continue;
      }
      if (!c.shown) {
        c.node.style.display = "inline-block";
        c.shown = true;
      }
      const p = clamp01((t - c.at) / CHAR_IN);
      if (p >= 1) {
        // 落定后撤掉 transform / opacity：每个字不再各自成层，
        // 后面纸放大时文字才会按最终尺寸重新栅格化，不会糊
        if (c.raw !== true) {
          c.node.style.opacity = "";
          c.node.style.transform = "none";
          c.raw = true;
        }
      } else {
        const e = easeOut(p);
        c.raw = false;
        c.node.style.opacity = String(e);
        c.node.style.transform =
          `translateY(${(parseFloat(c.node.dataset.jit) * (1 - e)).toFixed(2)}px)` +
          ` rotate(${(parseFloat(c.node.dataset.rot) * (1 - e)).toFixed(2)}deg)`;
      }
      activeLine = c.li;
    }

    /* 2.5 键帽：按下 → 停一下 → 弹回 */
    for (let i = 0; i < presses.length; i++) {
      const p = presses[i];
      const d = t - p.at;
      let amt = 0;
      if (d >= 0 && d < 150) {
        const q = d / 150;
        amt = q < 0.3 ? q / 0.3 : q < 0.62 ? 1 : (1 - (q - 0.62) / 0.38);
      }
      if (amt !== p.amt) {
        p.amt = amt;
        p.node.style.transform = amt
          ? `translateY(${(amt * 2.8).toFixed(2)}px) scale(${(1 - amt * 0.06).toFixed(3)})`
          : "";
        p.node.classList.toggle("is-down", amt > 0.55);
      }
    }

    /* 3. 光标：打字时常亮，打完开始闪 */
    const typing = t < TYPE_END;
    const blinkOn = typing || t % 1060 < 620;
    carets.forEach((c, i) => {
      // 还没开始打字时不显示光标
      const show = t >= T_START && i === activeLine && blinkOn;
      c.style.opacity = show ? "1" : "0";
    });

    /* 4. 打印机入场 */
    const enter = easeOut(clamp01(t / 460));

    /* 5. 放大 */
    let e = 0;
    if (t > ZOOM_START) {
      if (!zoom) zoom = zoomTarget();
      e = easeInOut(clamp01((t - ZOOM_START) / ZOOM_MS));
      const s = 1 + (zoom.s - 1) * e;
      paper.style.transform =
        `translate(${(zoom.tx * e).toFixed(2)}px, ${(zoom.ty * e).toFixed(2)}px) ` +
        `scale(${s.toFixed(4)})`;
      // 纸色跟着放大一起褪白；信笺头先退场，免得被屏幕顶边切掉
      if (wash) wash.style.opacity = e.toFixed(3);
      if (head) head.style.opacity = (1 - clamp01(e / 0.35)).toFixed(3);
      const k = 1 + (zoom.k - 1) * e;
      body.style.transform =
        `translate(${(zoom.shift * e).toFixed(2)}px, ${(-zoom.lift * e).toFixed(2)}px)` +
        ` scale(${k.toFixed(4)})`;
      el.classList.toggle("is-zoom", e > 0.005);
      el.classList.toggle("is-cover", e > 0.55);
    }

    machine.style.opacity = String(enter * (1 - clamp01((t - ZOOM_START) / 220)));
    machine.style.transform = `translateY(${((1 - enter) * 16 + e * 44).toFixed(2)}px)`;

    /* 6. 退场 */
    if (t > OUT_START) {
      const out = clamp01((t - OUT_START) / OUT_MS);
      el.style.opacity = String(1 - out * out);
      // 纸开始淡出的同时放 hero 入场；给 hero 一个更短的入场，跟 0.4s 的淡出齐平
      root.classList.add("is-handoff");
      root.classList.remove("is-intro");
    }
  }

  /* ---------- 收尾 ------------------------------------------------------ */

  let done = false;
  let raf = 0;

  function remember() {
    try {
      sessionStorage.setItem("intro", "1");
    } catch (err) {
      /* 隐私模式拿不到 sessionStorage，忽略 */
    }
  }

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.classList.remove("is-intro");
    el.hidden = true;
    el.style.opacity = "";
    remember();
    window.dispatchEvent(new CustomEvent("intro:done"));
  }

  /* 跳过：保持当前画面，快速淡出 */
  function skip() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.classList.add("is-handoff");
    root.classList.remove("is-intro");
    remember();

    const t0 = performance.now();
    const FADE = 220;
    const step = (now) => {
      const p = clamp01((now - t0) / FADE);
      el.style.opacity = String(1 - p);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        el.hidden = true;
        el.style.opacity = "";
      }
    };
    requestAnimationFrame(step);
    window.dispatchEvent(new CustomEvent("intro:done"));
  }

  /* ---------- 启动 ------------------------------------------------------ */

  const q = new URLSearchParams(location.search);
  const at = q.get("introAt");

  const begin = () => {
    // 等字体期间先不露出来，否则会先闪一下满高的空白纸
    el.hidden = false;

    // 调参用：?introK=1.14 把整组等比放大；
    // 多出来的高度不往上顶，而是把机器底部往屏幕下压、裁掉
    const stage = el.querySelector(".intro__stage");

    // 调参用：?introK= 整体缩放、?introPh= 纸的高宽比
    const k = parseFloat(q.get("introK"));
    const phr = parseFloat(q.get("introPh"));
    if (!isNaN(phr) && phr > 0) stage.style.setProperty("--phr", String(phr));
    if (!isNaN(k) && k > 0) stage.style.setProperty("--k", String(k));

    // 整组比视口高时，各浏览器对「靠底对齐」的处理不一样（有的会往上溢出）。
    // 这里直接量位置：只要纸顶跑到屏幕上方，就往下推回来，多出来的从机器底部裁掉。
    const layout = () => {
      stage.style.transform = "";
      const top = stage.getBoundingClientRect().top;
      stage.style.transform = top < 0 ? `translateY(${Math.round(-top)}px)` : "";
    };
    layout();
    window.addEventListener("resize", () => {
      layout();
      if (!zoom) measure();
    });

    measure();
    render(0);

    if (at !== null) {
      // 调试：定格在某一帧，方便截图对照
      render(Math.max(0, Number(at) || 0));
      if (q.get("introDebug")) {
        const r = paper.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        document.title = JSON.stringify({
          vw: innerWidth, vh: innerHeight,
          paper: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          body: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
          zoom,
          stageH: el.querySelector(".intro__stage").offsetHeight,
          ih: innerHeight,
          k: getComputedStyle(el.querySelector(".intro__stage")).getPropertyValue("--k"),
          pw: getComputedStyle(el.querySelector(".intro__stage")).getPropertyValue("--pw"),
          phr: getComputedStyle(el.querySelector(".intro__stage")).getPropertyValue("--phr"),
        });
      }
      return;
    }

    let t0 = 0;
    const frame = (now) => {
      if (!t0) t0 = now;
      const t = now - t0;
      render(t);
      if (t >= END) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    skipBtn.addEventListener("click", skip);
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") skip();
    });
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });
    window.addEventListener("pointerdown", (ev) => {
      if (ev.target === skipBtn) return;
      skip();
    });
  };

  // 等 Caveat 字体到位再开始，避免字宽跳动；最多等 1.4s
  let started = false;
  const once = () => {
    if (started) return;
    started = true;
    begin();
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(once);
  }
  setTimeout(once, 1400);
})();
