/* -------------------------------------------------------------------- tide
 * Tide view — the day's quota as a rising tide against a coastline:
 *   the sea level is today's total tokens as a share of a soft cap,
 *   waves roll in (session rhythm), a moon pulls them. Failed requests
 *   darken the water.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tide";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 97;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 14);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, shore = H * 0.62;

    seed = 97;
    const today = (ctx.data.today || []);
    const totTok = today.reduce((s, t) => s + (t.tokens || 0), 0) || sessions.reduce((s, x) => s + (x.tokens || 0), 0) || 1;
    const softCap = 5_000_000;
    const level = Math.min(0.95, totTok / softCap);
    const seaY = shore - level * (H - shore + 20);
    const failed = sessions.filter(s => s.status === "error" || s.status === "failed").length;
    const dim = failed > 0;

    // moon
    const moonY = H * 0.12;
    const moon = `<circle class="td-moon" cx="${W * 0.82}" cy="${moonY}" r="16" fill="rgba(240,220,180,.9)"/>
      <circle class="td-moon2" cx="${W * 0.82}" cy="${moonY}" r="26" fill="rgba(240,220,180,.06)"/>
      <path class="td-beam" d="M${W * 0.82 - 4},${moonY + 14} L${W * 0.82 - 20},${H} M${W * 0.82 + 4},${moonY + 14} L${W * 0.82 + 30},${H}"
        stroke="rgba(240,220,180,.08)" stroke-width="1"/>`;

    // coastline silhouette
    const coast = `<path class="td-coast" d="M0,${shore} Q${W * 0.2},${shore - 6} ${W * 0.4},${shore} T${W * 0.8},${shore - 8} T${W},${shore} V${H} H0 Z"
      fill="rgba(30,36,52,.6)"/>`;

    // sea
    const sea = `<rect class="td-sea ${dim ? "dim" : ""}" x="0" y="${seaY.toFixed(0)}" width="${W}" height="${(H - seaY).toFixed(0)}"
      fill="rgba(60,110,160,.55)"/>`;

    // wave crests
    let waves = "";
    for (let i = 0; i < 3; i++) {
      const wy = seaY + i * 4;
      const amp2 = 4 + i * 2;
      waves += `<path class="td-wave" d="M0,${wy.toFixed(0)} Q${W * 0.25},${wy - amp2} ${W * 0.5},${wy} T${W},${wy}"
          fill="none" stroke="rgba(150,200,230,.5)" stroke-width="1.4" stroke-linecap="round"
          style="animation-delay:${i * 500}ms"/>`;
    }

    // session buoys
    let buoys = "";
    sessions.slice(0, 8).forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const x = W * 0.1 + (i / 8) * W * 0.8;
      const y = seaY - 2 + rnd() * 6;
      const failed2 = s.status === "error" || s.status === "failed";
      buoys += `<g class="td-buoy ${failed2 ? "sink" : ""}" style="animation-delay:${i * 150}ms">
          <line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${x.toFixed(0)}" y2="${y - 8}" stroke="${col}" stroke-width="1"/>
          <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${failed2 ? 1.8 : 2.4}" fill="${col}"/>
          <title>${esc(s.title)} · ${s.agent}</title>
        </g>`;
    });

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed2 = s.status === "error" || s.status === "failed";
      return `<span class="tl-item ${failed2 ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="td-wrap">
        <div class="td-legend">${legend}<span class="tl-tip">潮=今日量 · 标=会话 · 暗=失败</span></div>
        <svg class="td-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${moon}${coast}${sea}${waves}${buoys}
          <text x="${W * 0.5}" y="${seaY - 12}" class="td-label" text-anchor="middle" fill="rgba(200,220,240,.5)">
            ${(totTok / 1e6).toFixed(1)}M · ${(level * 100).toFixed(0)}%
          </text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "潮汐",
    eyebrow: "TIDE",
    render
  };
})();
