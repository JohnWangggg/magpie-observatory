/* -------------------------------------------------------------- darkroom
 * Darkroom view — a photographic-developer canvas. The room is pitch
 * dark; a flashlight beam follows the cursor and reveals request logs
 * and session glyphs underneath.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "darkroom";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    // Under-painting: ghost grid of recent logs + session dots
    const recent = logs.slice(-40);
    const cols = Math.max(4, Math.ceil(Math.sqrt(recent.length * W / H)));
    const rowsN = Math.ceil(recent.length / cols);
    const cw = W / cols, ch = H / rowsN;

    let under = "";
    recent.forEach((l, i) => {
      const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch / 2;
      const col = metaOf(l.provider).color || "#8b7cf6";
      const err = l.status === "err";
      under += `<g class="dk-under" data-gx="${x.toFixed(0)}" data-gy="${y.toFixed(0)}">
        <rect x="${(x - 3).toFixed(0)}" y="${(y - 3).toFixed(0)}" width="6" height="6" rx="1.5"
              fill="${err ? "var(--red)" : col}" opacity=".6"/>
        <text x="${x.toFixed(0)}" y="${(y + 14).toFixed(0)}" text-anchor="middle" class="dk-lab">${esc((l.model || "?").split("/").pop().slice(0, 7))}</text>
      </g>`;
    });

    // Sessions as brighter glyphs (larger ring)
    sessions.forEach((s, i) => {
      const x = (i % 8) * (W / 8) + W / 16, y = 18 + (i * 37) % (H - 60);
      const col = metaOf(s.provider).color || "#8b7cf6";
      under += `<g class="dk-under dk-live" data-gx="${x.toFixed(0)}" data-gy="${y.toFixed(0)}">
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="none" stroke="${col}" stroke-width="1.6" opacity=".9">
          <animate attributeName="r" values="7;10;7" dur="2.6s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    });

    host.innerHTML = `
      <div class="dk-room">
        <svg class="dk-under-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${under}</svg>
        <svg class="dk-mask" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <radialGradient id="dkbeam" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#000" stop-opacity="0"/>
              <stop offset="40%" stop-color="#000" stop-opacity=".1"/>
              <stop offset="70%" stop-color="#000" stop-opacity=".96"/>
              <stop offset="100%" stop-color="#000"/>
            </radialGradient>
            <mask id="dkm">
              <rect width="${W}" height="${H}" fill="#fff"/>
              <circle id="dk-beam" cx="${W / 2}" cy="${H / 2}" r="${Math.min(W, H) * .28}" fill="url(#dkbeam)"/>
            </mask>
          </defs>
          <rect width="${W}" height="${H}" fill="var(--bg)" mask="url(#dkm)"/>
        </svg>
      </div>`;

    const beam = host.querySelector("#dk-beam");
    const underEls = [...host.querySelectorAll(".dk-under")];
    host.addEventListener("pointermove", e => {
      const r = host.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const y = ((e.clientY - r.top) / r.height) * H;
      beam?.setAttribute("cx", x); beam?.setAttribute("cy", y);
      const R = Math.min(W, H) * .3;
      underEls.forEach(el => {
        const dx = parseFloat(el.dataset.gx) - x, dy = parseFloat(el.dataset.gy) - y;
        const d = Math.hypot(dx, dy);
        const lit = d < R;
        el.classList.toggle("dk-lit", lit);
        if (lit) {
          const near = 1 - d / R;
          el.style.opacity = (.15 + near * .85).toFixed(2);
        } else {
          el.style.opacity = ".12";
        }
      });
    });
    // default dim
    underEls.forEach(el => { el.style.opacity = ".12"; });
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "暗房", eyebrow: "DARKROOM", render };
})();
