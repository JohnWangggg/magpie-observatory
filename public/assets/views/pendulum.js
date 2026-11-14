/* ---------------------------------------------------------------- pendulum
 * Pendulum view — sessions as a Newton's cradle of pendulums:
 *   each bob swings from a top pivot (rod length and swing arc =
 *   tokens, colour = agent, still = failed). Bobs tick out of phase.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pendulum";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 7);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const top = H * 0.1;

    if (!sessions.length) { host.innerHTML = `<div class="pe-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let pendulums = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.16 + (i / Math.max(1, n - 1)) * W * 0.68;
      const len = 60 + (tok / maxTok) * H * 0.55;
      const r = 8 + (tok / maxTok) * 8;
      const amp = failed ? 0 : 8 + (tok / maxTok) * 18;
      pendulums += `<g transform="translate(${x.toFixed(1)},${top.toFixed(1)})">
        <g class="pe-arm ${failed ? "still" : ""}" style="animation-duration:${(2 + (tok / maxTok) * 2).toFixed(1)}s; --amp:${amp.toFixed(0)}deg; animation-delay:${i * 220}ms">
          <line class="pe-rod" x1="0" y1="0" x2="0" y2="${len.toFixed(1)}" stroke="rgba(255,255,255,.35)" stroke-width="1.4"/>
          <circle class="pe-bob" cy="${len.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${failed ? ".45" : ".8"}">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </circle>
        </g>
        <circle class="pe-pivot" r="2.5" fill="rgba(255,255,255,.6)"/>
      </g>`;
    });

    // top beam
    const beam = `<line x1="${W * 0.12}" y1="${top}" x2="${W * 0.88}" y2="${top}" stroke="rgba(200,190,160,.4)" stroke-width="2.2" stroke-linecap="round"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="pe-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="pe-wrap">
        <div class="pe-legend">${legend}<span class="pe-tip">摆=会话 · 长=Token · 停=失败</span></div>
        <svg class="pe-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${beam}${pendulums}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "摆锤",
    eyebrow: "PENDULUM",
    render
  };
})();
