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

  /* ---------- 4. 首屏头像：眼珠 / 眼眶跟着鼠标 -------------------------- */
  /* 眼眶的两种形态是从「向左看」「向右看」两张图描出来的（各 72 个点，角度一一对应），
     指针横向位置在两者之间插值——瞳孔走，眼线也跟着鼓。
     纵向没有参考图，只让瞳孔上下小幅移动。 */
  const mark = document.querySelector(".hero__mark");
  const rings = mark ? Array.from(mark.querySelectorAll("[data-ring]")) : [];
  const clips = mark ? Array.from(mark.querySelectorAll("[data-clip]")) : [];
  const pupils = mark ? Array.from(mark.querySelectorAll("[data-pupil]")) : [];

  if (rings.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
      return {
        ring,
        clip: clips[i],
        pupil: pupils[i],
        cx: +eye.dataset.cx,
        cy: +eye.dataset.cy,
        x0: +pupils[i].getAttribute("x"),
        l: parsePath(document.getElementById("face-pose-l" + i).getAttribute("d")),
        r: parsePath(document.getElementById("face-pose-r" + i).getAttribute("d")),
      };
    });

    const TRAVEL = 190;   // 中间 → 一侧的位移量，略大于原图差值，保证两端顶住眶线
    const VERT = 16;      // 上下看时瞳孔的位移
    let want = 0.5;       // 0 = 看左，1 = 看右
    let wantV = 0;
    let cur = 0.5;
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

    const aim = (ev) => {
      const r = mark.getBoundingClientRect();
      if (!r.width) return;
      const nx = Math.max(-1, Math.min(1, (ev.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (ev.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      want = (nx + 1) / 2;
      wantV = ny * VERT;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const reset = () => {
      want = 0.5;
      wantV = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", aim, { passive: true });
    document.addEventListener("mouseleave", reset);
    window.addEventListener("blur", reset);
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
