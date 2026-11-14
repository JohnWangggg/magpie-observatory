/* ----------------------------------------------------------------- vortex
 * Vortex view — a logarithmic spiral drains the day's requests:
 *   each session is a particle on the spiral (size = tokens, colour =
 *   agent, spin speed = recency). Failed requests fall inward. A dark
 *   eye sits at the centre.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vortex";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 24);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) * 0.45;

    if (!sessions.length) { host.innerHTML = `<div class="vx-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const maxT = sessions.reduce((a, s) => Math.max(a, s.tries || 1), 1);

    // spiral path
    let spiral = `<path class="vx-spiral" d="M${cx},${cy} `;
    for (let t = 0; t <= 720; t += 15) {
      const a = t * Math.PI / 180;
      const r = 2 + (maxR - 2) * Math.pow(t / 720, 0.8);
      spiral += `L${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `;
    }
    spiral += `" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1" stroke-dasharray="3,5"/>`;

    let parts = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const tries = s.tries || 1;
      const failed = s.status === "error" || s.status === "failed";
      const frac = i / Math.max(1, sessions.length - 1);
      const a = frac * Math.PI * 4 - Math.PI / 2;
      const r = maxR * Math.pow(frac, 0.8) + 8;
      const size = 3 + (tok / maxTok) * 7;
      const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      const delay = i * 50;
      parts += `<g class="vx-part ${failed ? "sucked" : ""}" style="animation-delay:${delay}ms"
          transform="translate(${px.toFixed(1)},${py.toFixed(1)})">
        <circle class="vx-dot" r="${size.toFixed(1)}" fill="${col}" opacity="${failed ? ".35" : ".9"}"
          style="animation-duration:${(4 + tries / maxT * 4).toFixed(1)}s"/>
        <circle class="vx-ring" r="${(size + 2).toFixed(1)}" fill="none" stroke="${col}" stroke-width=".8" opacity="${failed ? ".2" : ".4"}"/>
        <title>${esc(s.title)} · ${s.agent} · ${s.tries} tries · ${tok} tok</title>
      </g>`;
    });

    // eye + glow
    const eye = `<circle class="vx-eye" cx="${cx}" cy="${cy}" r="${maxR * 0.1}" fill="rgba(0,0,0,.6)"/>
      <circle class="vx-eye-glow" cx="${cx}" cy="${cy}" r="${maxR * 0.18}" fill="rgba(139,124,246,.08)"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="vl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="vx-wrap">
        <div class="vx-legend">${legend}<span class="vl-tip">大=Token · 色=Agent · 吸=失败</span></div>
        <svg class="vx-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${eye}${spiral}${parts}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "漩涡",
    eyebrow: "VORTEX",
    render
  };
})();
