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

  /* ---------- 4. 首屏头像：眼珠跟着鼠标 ------------------------------- */
  /* 两只瞳孔是 SVG 里的独立形状，被眼白（clipPath）裁住；外面还套了一层
     眼眶组，跟着移动一小段并轻微缩放——眼珠转的时候眼白也跟着变。
     移动量用缓动追，停住就停 rAF；系统开了「减弱动效」就不启用。 */
  const mark = document.querySelector(".hero__mark");
  const eyes = mark ? Array.from(mark.querySelectorAll("[data-eye]")) : [];
  const pupils = mark ? Array.from(mark.querySelectorAll("[data-pupil]")) : [];

  if (pupils.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const AMP = 40;        // 瞳孔总位移（viewBox 单位，1200 对应 640px）
    const EYE_K = 0.3;     // 其中多少分给眼眶
    let nx = 0, ny = 0;    // 目标（归一化 -1..1）
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const paint = () => {
      const ex = cx * EYE_K;
      const ey = cy * EYE_K;
      const px = cx - ex;
      const py = cy - ey;
      const sx = (1 + 0.05 * Math.abs(nx)).toFixed(4);
      const sy = (1 + 0.012 * Math.abs(ny)).toFixed(4);

      for (const g of eyes) {
        const gx = +g.dataset.cx || 0;
        const gy = +g.dataset.cy || 0;
        g.setAttribute(
          "transform",
          `translate(${ex.toFixed(2)} ${ey.toFixed(2)}) ` +
          `translate(${gx} ${gy}) scale(${sx} ${sy}) translate(${-gx} ${-gy})`
        );
      }
      const v = `translate(${px.toFixed(2)} ${py.toFixed(2)})`;
      for (const el of pupils) el.setAttribute("transform", v);
    };

    const tick = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      if (Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15) {
        cx = tx;
        cy = ty;
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
      nx = Math.max(-1, Math.min(1, (ev.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ny = Math.max(-1, Math.min(1, (ev.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      tx = nx * AMP;
      ty = ny * AMP * 0.8;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const reset = () => {
      nx = 0;
      ny = 0;
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", aim, { passive: true });
    document.addEventListener("mouseleave", reset);
    window.addEventListener("blur", reset);
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
