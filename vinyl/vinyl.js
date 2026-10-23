/* ==========================================================================
   vinyl cover 动效引擎
   --------------------------------------------------------------------------
   参考录屏（黑胶从封套里滑出来那张）的运动逻辑：

     hover  → 黑胶从封套上方滑出 0.37S，露出唱片的 52%；同时作品名药丸浮现
     离开   → 唱片落回封套后面，名字隐去

   弹簧参数不是猜的，是按录屏实测曲线拟合的。从 900×651 的抽帧里量到：
     位移 129px（封套宽 342px），1.71s 起动，1.94s 到位，2.07s 稳定
     归一化后：50ms→0.30  90ms→0.61  140ms→0.82  180ms→1.00  230ms→1.016（过冲）  360ms→1.00
   拟合结果 k=0.12 / d=0.625，误差 0.003。见 README。

   全部由 rAF 驱动，不用 CSS 过渡：弹簧的过冲本来就做不出来，
   而且在动画时钟被冻结的环境里（部分内嵌 webview）CSS 过渡会停在起点。

   ---------------------------------------------------------------------------
   两种挂载方式，视觉结果完全一致：

   A. 挂载点里已经有静态标记（推荐，无 JS 时也有一屏封套）
        <div class="vc" data-vinyl="magiclab">
          <a class="vc__link" href="/work/magiclab/">
            <div class="vc__stage"> …disc… …sleeve… </div>
            <div class="vc__name"><span class="vc__pill">项目名</span></div>
          </a>
        </div>
      静态标记可以用 node tools/make_vinyl_markup.js 生成。

   B. 挂载点是空的 → 引擎自己生成整块卡片
        <div data-vinyl="magiclab"></div>
        <div data-vinyl="all"></div>   ← 一个挂载点装下所有项目

   零依赖。读 window.VINYL_PROJECTS 取数据。
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.VINYL_PROJECTS;
  if (!DATA || !DATA.projects) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 拟合自参考录屏。k 是劲度，d 是每帧阻尼，两者都按 16.7ms 一帧标定 */
  var K_DISC = 0.12, D_DISC = 0.625;
  /* 名字比唱片慢半拍——唱片的动感在前，文字跟上来，顺序读起来更顺 */
  var K_NAME = 0.1, D_NAME = 0.68;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* 带过冲的弹簧，逐帧积分。dtN 是"这一帧相当于几个 16.7ms"，让不同刷新率手感一致 */
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

  function projectBySlug(slug) {
    for (var i = 0; i < DATA.projects.length; i++) {
      if (DATA.projects[i].slug === slug) return DATA.projects[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */

  function Vinyl(project, host) {
    this.p = project;
    this.host = host;
    this.assetBase = host.getAttribute("data-asset-base") || "assets";
    this.el = null;

    this.hovered = false;
    this.focused = false;
    this.forced = false;   // 手动开关（demo / 调试用）
    this.touch = false;

    this.disc = { x: 0, v: 0 };
    this.name = { x: 0, v: 0 };

    this.raf = 0;
    this.lastNow = 0;
  }

  Vinyl.prototype.sleeveSrc = function () {
    return this.assetBase + "/sleeve/" + this.p.index + "-" + this.p.slug + ".jpg";
  };

  /* 生成一块卡片的标记。静态标记模式下不会走到这里 */
  Vinyl.prototype.cardMarkup = function () {
    var p = this.p;
    var src = this.sleeveSrc();

    return (
      '<a class="vc__link" href="' + p.href + '">' +
        '<div class="vc__stage">' +
          '<div class="vc__disc" aria-hidden="true">' +
            '<span class="vc__label"><img src="' + src + '" alt="" decoding="async"></span>' +
            '<span class="vc__hole"></span>' +
          "</div>" +
          '<div class="vc__sleeve">' +
            '<img src="' + src + '" alt="' + p.alt + '" decoding="async">' +
          "</div>" +
        "</div>" +
        '<div class="vc__name"><span class="vc__pill">' + p.title + "</span></div>" +
      "</a>"
    );
  };

  Vinyl.prototype.mount = function () {
    var el = this.host;

    // 挂载点本身就是卡片根。class 也让 HTML 里可以先写好（无 JS 时样式照样成立）
    el.classList.add("vc");

    if (!el.querySelector(".vc__stage")) {
      // 空挂载点：把这一张卡片的标记填进去
      el.insertAdjacentHTML("beforeend", this.cardMarkup());
    }

    this.el = el;
    this.stage = el.querySelector(".vc__stage");
    this.discEl = el.querySelector(".vc__disc");
    // 链接可能在卡片外面（站点里是 .card__link 包住整块），也可能在里面
    this.link = el.closest("a") || el.querySelector("a") || el;

    this.bindInput();
    // 先写一次初始状态：静止态就把唱片标成不渲染，
    // 不能等动画跑过一轮才加（视口外的卡片根本不会跑）
    this.write();
    this.observe();
    return el;
  };

  Vinyl.prototype.bindInput = function () {
    var self = this;
    var stage = this.stage;

    stage.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      self.hovered = true; self.play();
    });
    stage.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      self.hovered = false; self.play();
    });
    // 触摸屏没有 hover：按下即滑出，松手落回
    stage.addEventListener("pointerdown", function (e) {
      self.touch = e.pointerType !== "mouse";
      self.hovered = true; self.play();
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      stage.addEventListener(ev, function () {
        if (!self.touch) return;
        self.hovered = false; self.play();
      });
    });

    // 键盘：焦点落在卡片里的链接上时滑出，和无障碍焦点环配合
    this.link.addEventListener("focus", function () { self.focused = true; self.play(); });
    this.link.addEventListener("blur", function () { self.focused = false; self.play(); });
  };

  Vinyl.prototype.observe = function () {
    var self = this;

    if (REDUCED) {
      // 尊重 prefers-reduced-motion：状态照切，但不做滑动，直接到位
      this.snap();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      this.play();
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            self.play();
          } else if (Math.abs(self.disc.x - self.target()) < 0.001) {
            // 只在"已经到位"时才暂停。否则滑到一半滚出视口会被冻在半途
            // （frame() 自己会在走完后停 rAF，所以这里不会空转）
            self.pause();
          }
        });
      },
      { rootMargin: "80px 0px", threshold: 0.05 }
    );

    io.observe(this.el);
    this.io = io;
  };

  Vinyl.prototype.target = function () {
    return this.hovered || this.focused || this.forced ? 1 : 0;
  };

  Vinyl.prototype.snap = function () {
    var t = this.target();
    this.disc.x = t; this.disc.v = 0;
    this.name.x = t; this.name.v = 0;
    this.write();
  };

  Vinyl.prototype.play = function () {
    if (REDUCED) { this.snap(); return; }
    if (this.raf) return;
    var self = this;
    this.lastNow = 0;
    // 注意：frame() 返回 false 表示已经稳定，这时**不能**再排下一帧。
    // 早期版本在 frame() 里调 pause()，但 tick 紧接着又 requestAnimationFrame，
    // 结果循环永远停不下来——6 张卡片各自空转 60fps。
    var tick = function (now) {
      if (self.frame(now)) {
        self.raf = requestAnimationFrame(tick);
      } else {
        self.raf = 0;
      }
    };
    this.raf = requestAnimationFrame(tick);
  };

  Vinyl.prototype.pause = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Vinyl.prototype.frame = function (now) {
    var dtN = this.lastNow ? clamp((now - this.lastNow) / 16.667, 0.25, 3) : 1;
    this.lastNow = now;

    var t = this.target();
    spring(this.disc, t, K_DISC, D_DISC, dtN);
    spring(this.name, t, K_NAME, D_NAME, dtN);

    this.write();

    // 两边都稳定了 → 返回 false，让 tick 停掉 rAF
    if (Math.abs(this.disc.x - t) < 0.0005 && Math.abs(this.disc.v) < 0.0005 &&
        Math.abs(this.name.x - t) < 0.0005 && Math.abs(this.name.v) < 0.0005) {
      this.disc.x = t; this.disc.v = 0;
      this.name.x = t; this.name.v = 0;
      this.write();
      return false;
    }
    return true;
  };

  Vinyl.prototype.write = function () {
    this.el.style.setProperty("--vc-out", this.disc.x.toFixed(4));
    this.el.style.setProperty("--vc-name", clamp(this.name.x, 0, 1).toFixed(4));
    // 完全藏回封套后就不必再渲染这张圆盘了（见 CSS 里的 .is-off）
    if (this.discEl) this.discEl.classList.toggle("is-off", this.disc.x <= 0.0005);
  };

  /* 手动开关，给 demo / 调试用：不 hover 也能看滑出态 */
  Vinyl.prototype.setOpen = function (open) {
    this.forced = !!open;
    this.play();
    return this;
  };

  Vinyl.prototype.toggle = function () {
    return this.setOpen(!this.forced);
  };

  /* ------------------------------------------------------------------ */

  function init() {
    var hosts = document.querySelectorAll("[data-vinyl]");
    if (!hosts.length) return;

    var covers = window.vinylCovers || [];

    hosts.forEach(function (host) {
      // 已经挂过的跳过，重复调用 init 时不会生成两份
      if (host.dataset.vinylMounted === "1") return;

      var only = host.getAttribute("data-vinyl"); // "" / "all" / slug
      if (!only) return;

      // 挂载点里已经写好这一张卡片的标记 → 只接管，不生成
      if (host.querySelector(".vc__stage")) {
        var p = projectBySlug(only);
        if (!p) return;
        var one = new Vinyl(p, host);
        one.mount();
        covers.push(one);
        host.dataset.vinylMounted = "1";
        return;
      }

      // 空挂载点 → 生成。data-vinyl="all" 时装下所有项目
      var list = DATA.projects.filter(function (x) {
        return only === "all" || only === x.slug;
      });
      if (!list.length) return;

      list.forEach(function (x) {
        var slot = document.createElement("div");
        host.appendChild(slot);
        var v = new Vinyl(x, slot);
        v.mount();
        covers.push(v);
      });

      host.dataset.vinylMounted = "1";
    });

    window.vinylCovers = covers;
  }

  /* 暴露出去，页面切换项目时可以重新挂载，不用注入 <script> 重跑整个文件 */
  window.vinylMount = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
