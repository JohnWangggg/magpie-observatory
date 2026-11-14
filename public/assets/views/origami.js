/* ----------------------------------------------------------------- origami
 * Origami view — each session is a folded paper bird on a branch:
 *   body size = tokens, colour = agent, dashed crease = the fold.
 *   Failed requests perch lower and droop. A string + paper clip
 *   hangs each bird.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "origami";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function bird(x, y, size, color, failed, delay, label) {
    const w = size, h = size * 0.62;
    return `<g class="ori-bird ${failed ? "droop" : ""}" style="animation-delay:${delay}ms" transform="translate(${x},${y})">
      <!-- string -->
      <line x1="0" y1="${-h - 18}" x2="0" y2="${-h}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
      <circle cx="0" cy="${-h - 18}" r="1.5" fill="rgba(255,255,255,.4)"/>
      <!-- body — two folded triangles -->
      <path d="M0,0 L${-w},${-h * 0.6} L${-w * 0.4},${-h} L0,${-h * 0.2} Z" fill="${color}" opacity="${failed ? ".4" : ".85"}"/>
      <path d="M0,0 L${w * 0.9},${-h * 0.5} L${w * 0.35},${-h} L0,${-h * 0.2} Z" fill="${color}" opacity="${failed ? ".25" : ".6"}"/>
      <!-- head + beak -->
      <circle cx="0" cy="${-h}" r="${size * 0.1}" fill="${color}" opacity=".9"/>
      <path d="M${size * 0.08},${-h} L${size * 0.24},${-h * 1.06} L${size * 0.08},${-h * 0.94} Z" fill="rgba(255,255,255,.4)"/>
      <!-- crease lines -->
      <path class="ori-crease" d="M${-w},${-h * 0.6} L${w * 0.9},${-h * 0.5}" stroke="rgba(255,255,255,.3)" stroke-width=".8" stroke-dasharray="2,3"/>
      <path class="ori-crease" d="M${-w * 0.4},${-h} L${w * 0.35},${-h}" stroke="rgba(255,255,255,.15)" stroke-width=".8" stroke-dasharray="2,3"/>
      <title>${esc(label)}</title>
    </g>`;
  }

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 8);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const branchY = H * 0.6;

    if (!sessions.length) { host.innerHTML = `<div class="ori-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let birds = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const size = 24 + (tok / maxTok) * 30;
      const x = W * 0.1 + (i / Math.max(1, sessions.length - 1)) * (W * 0.8);
      const y = branchY + (failed ? 18 : 0);
      birds += bird(x, y, size, col, failed, i * 80, `${s.title} · ${s.agent} · ${s.status} · ${tok} tok`);
    });

    // branch
    const branch = `<line x1="0" y1="${branchY}" x2="${W}" y2="${branchY - 10}" stroke="rgba(150,110,70,.5)" stroke-width="3" stroke-linecap="round"/>
      <line x1="${W * 0.15}" y1="${branchY - 6}" x2="${W * 0.2}" y2="${branchY - 18}" stroke="rgba(150,110,70,.4)" stroke-width="1.5"/>
      <line x1="${W * 0.75}" y1="${branchY - 4}" x2="${W * 0.72}" y2="${branchY - 22}" stroke="rgba(150,110,70,.4)" stroke-width="1.5"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ol-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 12))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="ori-wrap">
        <div class="ori-legend">${legend}<span class="ol-tip">大=Token · 色=Agent · 垂=失败</span></div>
        <svg class="ori-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">
          ${branch}${birds}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "折纸",
    eyebrow: "ORIGAMI",
    render
  };
})();
