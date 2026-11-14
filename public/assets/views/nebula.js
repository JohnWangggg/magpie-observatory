/* ----------------------------------------------------------------- nebula
 * Nebula view — the session cloud as a colour nebula:
 *   each session is a soft blob (intensity = tokens, hue = agent,
 *   dim = failed); thin filaments of light cross the field and a
 *   faint particle drift fills the dark.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nebula";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 79;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 12);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;

    if (!sessions.length) { host.innerHTML = `<div class="nb-empty">暂无会话</div>`; return; }

    seed = 79;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;

    let blobs = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const r = Math.min(W, H) * 0.22 + rnd() * (Math.min(W, H) * 0.18);
      const x = cx + r * Math.cos(a) * 1.6, y = cy + r * Math.sin(a) * 0.7;
      const size = 18 + (tok / maxTok) * 44;
      blobs += `<ellipse class="nb-blob ${failed ? "faint" : ""}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}"
          rx="${size.toFixed(0)}" ry="${(size * 0.6).toFixed(0)}" fill="${col}"
          style="animation-delay:${i * 120}ms; filter: blur(2px)">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </ellipse>`;
    });

    let filaments = "";
    for (let i = 0; i < 5; i++) {
      const y = cy - H * 0.2 + rnd() * H * 0.4;
      filaments += `<path class="nb-fila" d="M0,${y.toFixed(0)} Q${W * 0.3},${y - 30} ${W * 0.6},${y + 20} T${W},${y - 10}"
          fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${(0.5 + rnd()).toFixed(1)}"
          style="animation-delay:${i * 300}ms"/>`;
    }

    let dust = "";
    for (let i = 0; i < 20; i++) {
      dust += `<circle class="nb-dust" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}"
          r="${(0.5 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.3)"
          style="animation-delay:${(rnd() * 4).toFixed(1)}s"/>`;
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="nl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="nb-wrap">
        <div class="nb-legend">${legend}<span class="nl-tip">云=会话 · 大=Token · 淡=失败</span></div>
        <svg class="nb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="nb-soft"><feGaussianBlur stdDeviation="14"/></filter>
          </defs>
          ${dust}${filaments}
          <g class="nb-cloud" filter="url(#nb-soft)">${blobs}</g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "星云",
    eyebrow: "NEBULA",
    render
  };
})();
