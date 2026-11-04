/* ==========================================================================
   周晓旭 · Portfolio — main.js
   1. 页脚年份
   2. 邮箱：一次点击同时「打开邮件客户端 + 复制地址」
   3. 作品卡片滚动渐入（带保险回退；现在首页没有 .card，这段会自动跳过）
   ========================================================================== */

(() => {
  "use strict";

  /* ---------- 1. 页脚年份 --------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 2. 邮箱：跳转 + 复制 ------------------------------------- */
  /* 点击不阻止默认行为：mailto 照常唤起邮件客户端，同时把地址写进剪贴板，
     并给一句「已复制」的反馈。剪贴板 API 需要安全上下文（https / localhost），
     拿不到就退回 execCommand。 */
  const mailEl = document.querySelector(".contact__mail");
  const copiedEl = document.querySelector("[data-copied]");

  function legacyCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-2000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  if (mailEl && copiedEl) {
    const addr = (mailEl.getAttribute("data-mail") ||
      mailEl.getAttribute("href").replace(/^mailto:/i, "")).trim();
    let hintTimer;

    mailEl.addEventListener("click", () => {
      copyText(addr).then((ok) => {
        copiedEl.textContent = ok ? "已复制 " + addr : "复制失败，请手动选择";
        copiedEl.classList.toggle("is-failed", !ok);
        copiedEl.classList.add("is-on");
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => copiedEl.classList.remove("is-on"), 2000);
      });
    });
  }

  /* ---------- 4. 眼动：首屏大脸 + 右下角标 ---------------------------- */
  /* 眼眶的两种形态是从「向左看」「向右看」两张图描出来的（各 72 个点，角度一一对应），
     指针横向位置在两者之间插值——瞳孔走，眼线也跟着鼓。
     首屏那只全程跟着指针；右下角标只在鼠标移到它上面时才动，移开回正。 */
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

  function initFace(root, prefix, rest) {
    const REST = rest === undefined ? 0.5 : rest;   // 默认看向正前方；角标传 0（看左）
    const rings = Array.from(root.querySelectorAll("[data-ring]"));
    const clips = Array.from(root.querySelectorAll("[data-clip]"));
    const pupils = Array.from(root.querySelectorAll("[data-pupil]"));
    if (!rings.length) return null;

    const parsePath = (d) =>
      d.slice(1).replace(/Z\s*$/, "").split("L").map((p) => p.split(" ").map(Number));
    const toPath = (pts) =>
      "M" + pts.map((p) => Math.round(p[0]) + " " + Math.round(p[1])).join("L") + "Z";
    const inset = (pts, cx, cy, d) =>
      pts.map(([x, y]) => {
        const vx = cx - x;
        const vy = cy - y;
        const len = Math.hypot(vx, vy) || 1;
        return [x + (vx / len) * d, y + (vy / len) * d];
      });

    const eyes = rings.map((ring, i) => {
      const eye = ring.closest("[data-eye]");
      const l = document.getElementById(prefix + "l" + i);
      const r = document.getElementById(prefix + "r" + i);
      if (!eye || !l || !r) return null;
      return {
        ring,
        clip: clips[i],
        pupil: pupils[i],
        cx: +eye.dataset.cx,
        cy: +eye.dataset.cy,
        x0: +pupils[i].getAttribute("x"),
        l: parsePath(l.getAttribute("d")),
        r: parsePath(r.getAttribute("d")),
      };
    });
    if (eyes.some((e) => !e)) return null;

    const TRAVEL = 190;   // 中间 → 一侧的位移量，略大于原图差值，保证两端顶住眶线
    const VERT = 16;      // 上下看时瞳孔的位移
    let want = REST;      // 0 = 看左，1 = 看右，0.5 = 正前方
    let wantV = 0;
    let cur = REST;
    let curV = 0;
    let raf = 0;

    const paint = () => {
      for (const e of eyes) {
        const pts = e.l.map((p, k) => [
          p[0] + (e.r[k][0] - p[0]) * cur,
          p[1] + (e.r[k][1] - p[1]) * cur,
        ]);
        const outer = toPath(pts);
        const socket = inset(pts, e.cx, e.cy, 30);
        // 瞳孔裁到「眼白」而不是外轮廓：顶到眶线时会被裁齐，不会留缝
        e.clip.setAttribute("d", toPath(socket));
        e.ring.setAttribute("d", outer + toPath(socket.slice().reverse()));
        e.pupil.setAttribute("x", (e.x0 + (cur - 0.5) * TRAVEL).toFixed(1));
        e.pupil.setAttribute("transform", "translate(0 " + curV.toFixed(1) + ")");
      }
    };

    const tick = () => {
      cur += (want - cur) * 0.16;
      curV += (wantV - curV) * 0.16;
      if (Math.abs(want - cur) < 0.002 && Math.abs(wantV - curV) < 0.3) {
        cur = want;
        curV = wantV;
        paint();
        raf = 0;
        return;
      }
      paint();
      raf = requestAnimationFrame(tick);
    };

    return {
      aim(nx, ny) {
        want = (clamp1(nx) + 1) / 2;
        wantV = clamp1(ny) * VERT;
        if (!raf) raf = requestAnimationFrame(tick);
      },
      reset() {
        want = REST;
        wantV = 0;
        if (!raf) raf = requestAnimationFrame(tick);
      },
    };
  }

  if (!reducedMotion) {
    // 首屏：整页移动指针都跟着走
    const heroMark = document.querySelector(".hero__mark");
    const heroFace = heroMark ? initFace(heroMark, "face-pose-") : null;
    if (heroFace) {
      window.addEventListener("pointermove", (ev) => {
        const r = heroMark.getBoundingClientRect();
        if (!r.width) return;
        heroFace.aim(
          (ev.clientX - (r.left + r.width / 2)) / (r.width / 2),
          (ev.clientY - (r.top + r.height / 2)) / (r.height / 2)
        );
      }, { passive: true });
      document.addEventListener("mouseleave", heroFace.reset);
      window.addEventListener("blur", heroFace.reset);
    }

    // 右下角标：鼠标移到角标范围内才动，移开回正
    const badge = document.querySelector('[data-face="badge"]');
    const badgeFace = badge ? initFace(badge, "badge-pose-", 0) : null;
    if (badgeFace) {
      window.addEventListener("pointermove", (ev) => {
        const b = badge.getBoundingClientRect();
        if (ev.clientX < b.left || ev.clientX > b.right || ev.clientY < b.top || ev.clientY > b.bottom) return;
        badgeFace.aim(
          (ev.clientX - (b.left + b.width / 2)) / (b.width / 2),
          (ev.clientY - (b.top + b.height / 2)) / (b.height / 2)
        );
      }, { passive: true });
      badge.addEventListener("pointerleave", () => badgeFace.reset());
    }
  }

  /* ---------- 5. 回到顶部 --------------------------------------------- */
  /* 滚过半屏才浮出来；淡入用 rAF 自己写（部分内置浏览器里 CSS 过渡不跑） */
  const topBtn = document.querySelector("[data-to-top]");
  if (topBtn) {
    // 直接切类：不用过渡也不用 rAF——预览环境里动画时钟会停摆，
    // 而这个按钮必须"该出现就一定出现"
    const sync = () => {
      topBtn.classList.toggle("is-on", window.scrollY > window.innerHeight * 0.6);
    };

    window.addEventListener("scroll", sync, { passive: true });
    sync();
    // 带锚点进来（或刷新后浏览器恢复到中间）时，滚动的第一帧不一定有事件
    setTimeout(sync, 350);

    topBtn.addEventListener("click", () => {
      const from = window.scrollY;
      if (!from) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.scrollTo(0, 0);
        return;
      }
      const t0 = performance.now();
      const dur = Math.min(700, 260 + from * 0.12);
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        window.scrollTo({ top: from * (1 - e), behavior: "instant" });
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ---------- 6. 区块吸附 --------------------------------------------- */
  /* 首页三块（首屏 / 作品 / 关于）用同一套规则：滚动停下时，如果离某块的
     「对齐位」不超过 42% 屏高（约等于该块露出 58% 以上），就补过去。
     对齐位 = 该块顶边贴到假浏览器窗口下沿；最后一块贴不到时按页面底部算。 */
  const snapEls = [".hero", ".works--stage", ".about"]
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);

  if (snapEls.length === 3) {
    const chromeEl = document.querySelector(".chrome");
    const chromeH = chromeEl ? chromeEl.getBoundingClientRect().height : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let snapTimer = 0;
    let snapRaf = 0;
    let snapUntil = 0;

    const maxY = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const targetY = (el) => {
      const y = el.getBoundingClientRect().top + window.scrollY - chromeH;
      return Math.max(0, Math.min(Math.round(y), maxY()));
    };

    const glide = (to) => {
      const from = window.scrollY;
      if (reduced) { window.scrollTo(0, to); return; }
      cancelAnimationFrame(snapRaf);
      const t0 = performance.now();
      snapUntil = t0 + 420;
      (function step(now) {
        const k = Math.min(1, (now - t0) / 300);
        const e = 1 - Math.pow(1 - k, 3);
        window.scrollTo({ top: from + (to - from) * e, behavior: "instant" });
        snapRaf = k < 1 ? requestAnimationFrame(step) : 0;
      })(t0);
    };

    const trySnap = () => {
      if (performance.now() < snapUntil) return;
      const vh = window.innerHeight;
      let best = 0;
      let found = false;
      for (const el of snapEls) {
        const d = targetY(el) - window.scrollY;
        if (Math.abs(d) < 6) return;            // 已经对齐了某一块
        if (!found || Math.abs(d) < Math.abs(best)) { best = d; found = true; }
      }
      if (!found || Math.abs(best) > vh * 0.42) return;   // 在块中间：不吸
      glide(window.scrollY + best);
    };

    window.addEventListener("scroll", () => {
      if (performance.now() < snapUntil) return;  // 自己补间产生的事件
      clearTimeout(snapTimer);
      snapTimer = setTimeout(trySnap, 170);
    }, { passive: true });
  }

  /* ---------- 3. 滚动渐入 --------------------------------------------- */
  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealAll = () => cards.forEach((el) => el.classList.add("is-in"));

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  let fired = false;

  // 保险：若 1.5s 内观察器一次都没回调（后台标签页等环境会延迟触发），
  // 直接全部显示，避免内容永久不可见。
  const safety = setTimeout(() => {
    if (!fired) revealAll();
  }, 1500);

  const observer = new IntersectionObserver(
    (entries) => {
      fired = true;
      clearTimeout(safety);
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );

  cards.forEach((el) => observer.observe(el));
})();
