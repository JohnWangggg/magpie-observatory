/* ------------------------------------------------------------------- rain
 * Rain view — every request is a raindrop in a night storm:
 *   drop length = tokens, colour = agent, slant = wind direction.
 *   Drops hit a puddle line and ring it; failed drops splash red.
 *   A few clouds hang overhead.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rain";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 20);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ground = H - 40;

    if (!sessions.length) { host.innerHTML = `<div class="rn-empty">暂无会话</div>`; return; }

    seed = 31;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let drops = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = 20 + (i / Math.max(1, sessions.length - 1)) * (W - 40) + (rnd() - 0.5) * 30;
      const len = 8 + (tok / maxTok) * 20;
      const slant = 4 + rnd() * 6; // wind
      const dur = 1.2 + rnd() * 1.2, delay = i * 120;
      drops += `<line class="rn-drop ${failed ? "bad" : ""}" style="animation-delay:${delay}ms;animation-duration:${dur.toFixed(1)}s"
          x1="${x.toFixed(0)}" y1="0" x2="${(x + slant).toFixed(0)}" y2="${len.toFixed(0)}"
          stroke="${failed ? "#f26d7f" : col}" stroke-width="1.6" stroke-linecap="round" opacity="${failed ? ".6" : ".8"}">
        <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
      </line>
      <ellipse class="rn-splash" cx="${(x + slant * 0.8).toFixed(0)}" cy="${ground}"
        rx="${(4 + tok / maxTok * 7).toFixed(1)}" ry="${(2 + tok / maxTok * 2).toFixed(1)}"
        fill="none" stroke="${col}" stroke-width="1"
        style="animation-duration:${dur.toFixed(1)}s;animation-delay:${delay}ms"/>`;
    });

    // puddle line
    const puddle = `<line class="rn-ground" x1="0" y1="${ground}" x2="${W}" y2="${ground}"
      stroke="rgba(255,255,255,.15)" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1,5"/>`;
    // clouds
    let clouds = "";
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + i * 0.3), cy = 18 + rnd() * 12;
      clouds += `<g class="rn-cloud" style="animation-delay:${i * 400}ms">
          <ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(30 + rnd() * 20).toFixed(0)}" ry="${(8 + rnd() * 4).toFixed(1)}" fill="rgba(255,255,255,.05)"/>
          <ellipse cx="${(cx - 14).toFixed(0)}" cy="${(cy - 5).toFixed(0)}" rx="${(16 + rnd() * 10).toFixed(0)}" ry="${(7 + rnd() * 3).toFixed(1)}" fill="rgba(255,255,255,.06)"/>
        </g>`;
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="rl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="rn-wrap">
        <div class="rn-legend">${legend}<span class="rl-tip">滴=会话 · 长=Token · 红=失败</span></div>
        <svg class="rn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">
          ${clouds}${puddle}${drops}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "雨幕",
    eyebrow: "RAIN",
    render
  };
})();
