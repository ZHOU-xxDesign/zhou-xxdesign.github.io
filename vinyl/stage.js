/* ==========================================================================
   作品台 —— 一屏一个项目
   --------------------------------------------------------------------------
   · 唱片交互和黑胶组件一致：hover 从封套上方抽出，露出 62%（一多半）
   · 颜色圆点切换项目；圆点色取各封面的点缀色，下面带编号
     （四张封面同属蓝色系，光靠颜色分不出来，编号是必须的）
   · 整块背景跟着项目身份色淡染
   · 最新的项目排第一个

   所有动效走 rAF，不用 CSS 过渡——预览环境会冻结 document.timeline，
   而且弹簧的过冲本来就做不出来。
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.VINYL_PROJECTS;
  if (!DATA || !DATA.projects) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PROJECTS = DATA.projects;

  var stageEl = document.querySelector("[data-stage]");
  var sceneEl = document.querySelector("[data-scene]");
  var dotsEl = document.querySelector("[data-dots]");
  if (!stageEl || !dotsEl) return;

  var coverImg = document.querySelector("[data-cover]");
  var labelImg = document.querySelector("[data-label]");
  var idxEl = document.querySelector("[data-idx]");
  var titleEl = document.querySelector("[data-title]");
  var metaEl = document.querySelector("[data-meta]");
  var discEl = document.querySelector(".stage__disc");
  var countEl = document.querySelector(".works__count");
  var secEl = document.querySelector(".stage-sec");

  /* 静息露出量（和 CSS 的 --peek 一致）与"弹出"时长 */
  var PEEK = 0.12;
  var POP_MS = 1300;

  var current = 0;
  var open = { x: 0, v: 0 };
  var popUntil = 0;          // 切换项目后自动弹出的截止时间
  var swap = 0;
  var swapping = false;
  var hovered = false;
  var raf = 0;
  var lastNow = 0;
  var popTimer = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* 和黑胶组件同一套手感 */
  function spring(st, target, k, d, dtN) {
    var steps = Math.min(dtN, 3);
    while (steps > 0) {
      var s = Math.min(1, steps);
      st.v += (target - st.x) * k * s;
      st.v *= Math.pow(d, s);
      st.x += st.v * s;
      steps -= s;
    }
    return st.x;
  }

  function src(p) {
    return "/vinyl/assets/sleeve/" + p.index + "-" + p.slug + ".jpg";
  }

  /* ---------- 绘制 ---------- */

  function paint() {
    var v = clamp(open.x, 0, 1);
    stageEl.style.setProperty("--open", v.toFixed(4));
    stageEl.style.setProperty("--swap", swap.toFixed(4));
    // 只有"实际位置"为 0 时才不必渲染；静止露出一截时要一直渲染
    var pos = PEEK + (1 - PEEK) * v;
    if (discEl) discEl.classList.toggle("is-off", pos <= 0.0005);
  }

  function targetOpen() {
    if (hovered) return 1;
    if (popUntil && performance.now() < popUntil) return 1;
    return 0;
  }

  function tick(now) {
    var dtN = lastNow ? clamp((now - lastNow) / 16.667, 0.25, 3) : 1;
    lastNow = now;

    spring(open, targetOpen(), 0.11, 0.74, dtN);
    paint();

    var settled = Math.abs(open.x - targetOpen()) < 0.0005 && Math.abs(open.v) < 0.0005;
    if (settled) {
      open.x = targetOpen(); open.v = 0; paint();
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (REDUCED) {
      open.x = targetOpen(); open.v = 0; paint();
      return;
    }
    if (raf) return;
    lastNow = 0;
    raf = requestAnimationFrame(tick);
  }

  /* ---------- 切换 ---------- */

  function apply(i) {
    var p = PROJECTS[i];
    var s = src(p);

    // 新项目还没配图时别显示裂图，交给 CSS 的占位
    if (secEl) secEl.classList.remove("is-missing");
    coverImg.src = s;
    coverImg.alt = p.alt;
    labelImg.src = s;

    idxEl.textContent = p.index + " / " + String(PROJECTS.length).padStart(3, "0");
    // 整个舞台指向这个项目的详情页
    if (sceneEl && sceneEl.tagName === "A") sceneEl.href = p.href;
    titleEl.textContent = p.title;
    titleEl.href = p.href;
    metaEl.textContent = p.meta || "";

    document.documentElement.style.setProperty("--accent", p.accent);

    [].forEach.call(dotsEl.children, function (d, k) {
      d.setAttribute("aria-selected", k === i ? "true" : "false");
      d.tabIndex = k === i ? 0 : -1;
    });
  }

  /* 切换：淡出 → 换内容 → 淡入，用 rAF 自己补间 */
  function pop(ms) {
    popUntil = performance.now() + (ms || POP_MS);
    play();
    // 到点后目标值变回 0，得有人把弹簧推回去
    clearTimeout(popTimer);
    popTimer = setTimeout(function () {
      popUntil = 0;
      play();
    }, (ms || POP_MS) + 30);
  }

  function select(i) {
    if (i === current || swapping) return;
    current = i;
    swapping = true;

    var t0 = performance.now();
    var OUT = REDUCED ? 0 : 180;
    var IN = REDUCED ? 0 : 320;

    function out(now) {
      var k = OUT ? clamp((now - t0) / OUT, 0, 1) : 1;
      swap = k; paint();
      if (k < 1) { requestAnimationFrame(out); return; }

      apply(i);
      // 换项目的瞬间把唱片弹出来，让人看见"里面有一张"
      pop();
      var t1 = performance.now();
      function back(n2) {
        var k2 = IN ? clamp((n2 - t1) / IN, 0, 1) : 1;
        swap = 1 - (1 - Math.pow(1 - k2, 3));   // easeOutCubic
        paint();
        if (k2 < 1) { requestAnimationFrame(back); return; }
        swap = 0; paint();
        swapping = false;
      }
      requestAnimationFrame(back);
    }
    requestAnimationFrame(out);
  }

  /* ---------- 圆点 ---------- */

  PROJECTS.forEach(function (p, i) {
    var b = document.createElement("button");
    b.className = "dot";
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", p.index + " " + p.title);
    b.style.setProperty("--c", p.accent);
    b.innerHTML =
      '<span class="dot__swatch"></span>' +
      '<span class="dot__no">' + p.index + "</span>";
    b.addEventListener("click", function () { select(i); });
    dotsEl.appendChild(b);
  });

  /* ---------- 输入 ---------- */

  stageEl.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "touch") return;
    hovered = true; play();
  });
  stageEl.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "touch") return;
    hovered = false; play();
  });

  // 键盘：焦点落在舞台上先抽出来预览，Enter 才是跳转
  sceneEl.addEventListener("focus", function () { hovered = true; play(); });
  sceneEl.addEventListener("blur", function () { hovered = false; play(); });

  // 圆点上用左右方向键切换
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!dotsEl.contains(document.activeElement)) return;
    var next = current + (e.key === "ArrowRight" ? 1 : -1);
    if (next < 0) next = PROJECTS.length - 1;
    if (next >= PROJECTS.length) next = 0;
    select(next);
    dotsEl.children[next].focus();
    e.preventDefault();
  });

  /* ---------- 滚轮切换 ---------- */
  /* 鼠标在作品台上滚动：下滑看下一个，上滑看上一个。
     到两端就放行，让页面正常滚动，不会把人困在这里。
     触控板一次轻扫会连发十几个事件，所以用「累积量 + 冷却」控制节奏。 */
  var sectionEl = document.querySelector(".works--stage");
  var WHEEL_LOCK = 520;    // 两次切换之间的最短间隔
  var WHEEL_STEP = 24;     // 累积多少才算一次有效滚动
  var lastSwitch = 0;
  var acc = 0;

  function stageInFocus() {
    if (!sectionEl) return false;
    var r = sectionEl.getBoundingClientRect();
    var vh = window.innerHeight;
    // 区块基本占满视口中间那段才接管
    return r.top < vh * 0.32 && r.bottom > vh * 0.68;
  }

  if (sectionEl) {
    window.addEventListener("wheel", function (ev) {
      if (REDUCED || ev.ctrlKey) return;          // 减弱动效 / 缩放：不拦
      if (!stageInFocus() || Math.abs(ev.deltaY) < 1) return;

      var next = current + (ev.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= PROJECTS.length) { acc = 0; return; }

      ev.preventDefault();
      acc += ev.deltaY;

      var now = performance.now();
      if (now - lastSwitch < WHEEL_LOCK || Math.abs(acc) < WHEEL_STEP) return;

      acc = 0;
      lastSwitch = now;
      select(next);
    }, { passive: false });
  }

  /* ---------- 起步 ---------- */

  // 区块标题右边的区间 (001 — 00N) 跟着项目数走，不用手改 HTML
  if (countEl && PROJECTS.length) {
    countEl.textContent = "(" + PROJECTS[0].index + " — " +
      PROJECTS[PROJECTS.length - 1].index + ")";
  }

  apply(0);
  paint();

  // 封套图加载失败（比如新项目还没配图）→ 显示占位而不是裂图
  coverImg.addEventListener("error", function () {
    if (secEl) secEl.classList.add("is-missing");
  });
  coverImg.addEventListener("load", function () {
    if (secEl) secEl.classList.remove("is-missing");
  });

  // 第一次滚到作品区时自动弹一次——静止只露一截，很多人不会想到去 hover
  if ("IntersectionObserver" in window) {
    var seen = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen) return;
        seen = true;
        io.disconnect();
        pop(1500);
      });
    }, { threshold: 0.55 });
    io.observe(stageEl);
  }

  // 预加载，切换时不闪
  PROJECTS.forEach(function (p) { var im = new Image(); im.src = src(p); });
})();
