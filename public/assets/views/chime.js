/* ------------------------------------------------------------------- chime
 * Chime view — sessions as hanging wind chimes:
 *   each tube's length = tokens, colour = agent, cracked = failed.
 *   Tubes sway gently in a breeze under a top bar.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "chime";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 9);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const top = H * 0.16;

    if (!sessions.length) { host.innerHTML = `<div class="ch-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let tubes = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.12 + (i / Math.max(1, n - 1)) * W * 0.76;
      const len = 26 + (tok / maxTok) * H * 0.4;
      const sw = 5 + (tok / maxTok) * 4;
      tubes += `<g transform="translate(${x.toFixed(1)},${top.toFixed(1)})">
        <g class="ch-tube ${failed ? "crack" : ""}" style="animation-delay:${i * 200}ms; animation-duration:${(3 + (i % 3)).toFixed(1)}s">
          <line class="ch-string" x1="0" y1="0" x2="0" y2="${(top * 0.4).toFixed(0)}" stroke="rgba(255,255,255,.3)"/>
          <rect class="ch-body" x="${(-sw / 2).toFixed(1)}" y="${(top * 0.4).toFixed(0)}" width="${sw.toFixed(1)}" height="${len.toFixed(1)}"
            rx="${(sw / 2.5).toFixed(1)}" fill="${col}" opacity="${failed ? ".4" : ".7"}">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </rect>
          <circle class="ch-clapper" cy="${(top * 0.4 + len + 8).toFixed(0)}" r="${(sw * 0.35).toFixed(1)}" fill="rgba(255,255,255,.6)"/>
          ${failed ? `<path class="ch-crack" d="M${(-sw / 2).toFixed(1)},${(top * 0.4 + len * 0.4).toFixed(0)} l${(sw * 0.5).toFixed(1)},-6 l${(-sw * 0.4).toFixed(1)},-5" stroke="#f26d7f" stroke-width="1" fill="none"/>` : ""}
        </g>
      </g>`;
    });

    // top bar
    const bar = `<line x1="${W * 0.08}" y1="${top}" x2="${W * 0.92}" y2="${top}" stroke="rgba(200,190,160,.4)" stroke-width="2.4" stroke-linecap="round"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="cl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="ch-wrap">
        <div class="ch-legend">${legend}<span class="cl-tip">管=会话 · 长=Token · 裂=失败</span></div>
        <svg class="ch-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${bar}${tubes}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "风铃",
    eyebrow: "CHIME",
    render
  };
})();
