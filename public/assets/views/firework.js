/* ---------------------------------------------------------------- firework
 * Firework view — sessions as fireworks over the panel:
 *   each session launches a burst (spoke count and radius = tokens,
 *   colour = agent, sputter = failed); trails streak up from below.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "firework";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 89;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 8);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ground = H * 0.94;

    if (!sessions.length) { host.innerHTML = `<div class="fw-empty">暂无会话</div>`; return; }

    seed = 89;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let bursts = "", trails = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.1 + (i / Math.max(1, n - 1)) * W * 0.8;
      const y = H * 0.2 + rnd() * H * 0.3;
      const R = 14 + (tok / maxTok) * 36;
      const spokes = failed ? 6 : 10 + Math.floor((tok / maxTok) * 8);
      // launch trail
      trails += `<line class="fw-trail" x1="${x.toFixed(0)}" y1="${ground}" x2="${x.toFixed(0)}" y2="${(y + 4).toFixed(0)}"
          stroke="${col}" stroke-width="1.4" opacity=".4" stroke-dasharray="4,6" style="animation-delay:${i * 200}ms"/>`;
      // burst spokes — nested g: outer positions, inner scales from origin
      let sp = "";
      for (let b = 0; b < spokes; b++) {
        const a = (b / spokes) * Math.PI * 2;
        const len = R * (0.6 + rnd() * 0.4);
        sp += `<line x1="0" y1="0" x2="${(Math.cos(a) * len).toFixed(1)}" y2="${(Math.sin(a) * len).toFixed(1)}"
            stroke="${col}" stroke-width="1.6"/>`;
      }
      bursts += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)})">
          <g class="fw-b ${failed ? "sput" : ""}" style="animation-delay:${i * 200}ms">${sp}</g>
          <circle class="fw-core ${failed ? "sput" : ""}" r="${(3 + (tok / maxTok) * 4).toFixed(1)}" fill="${col}" style="animation-delay:${i * 200}ms">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </circle></g>`;
    });

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="fl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="fw-wrap">
        <div class="fw-legend">${legend}<span class="fl-tip">爆=会话 · 径=Token · 哑=失败</span></div>
        <svg class="fw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${trails}${bursts}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "烟花",
    eyebrow: "FIREWORK",
    render
  };
})();
