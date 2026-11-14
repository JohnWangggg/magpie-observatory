/* -------------------------------------------------------------------- pampa
 * Pampa — a wide dry plain at sundown: every quota window is a
 * tumbleweed whose roll diameter = used % (≥85% it spins into a
 * red willy-willy); sessions are gauchos riding the skyline.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pampa";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(24681357);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 226;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // tumbleweeds — diameter = used %
    const weeds = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b89a5a";
      const r = 9 + f * 24;
      const cy = GY - r;
      // woven twig ball — crossed strokes
      let twigs = "";
      for (let t = 0; t < 7; t++) {
        const a = (t / 7) * Math.PI;
        twigs += `<line x1="${(cx - r * Math.cos(a)).toFixed(1)}" y1="${(cy - r * Math.sin(a) * .5).toFixed(1)}" x2="${(cx + r * Math.cos(a)).toFixed(1)}" y2="${(cy + r * Math.sin(a) * .5).toFixed(1)}" stroke="${hot ? "var(--red)" : col}" stroke-width=".9" opacity="${(.4 + f * .4).toFixed(2)}"/>`;
      }
      const ball = `<circle cx="${cx}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${hot ? "var(--red)" : col}" stroke-width="1.1" stroke-dasharray="5 4"/>`;
      // slow roll wobble
      const wobble = `<animateTransform attributeName="transform" type="translate" values="0 0;${hot ? 0 : (i % 2 ? 3 : -3)} 0;0 0" dur="${(3 + i * .4).toFixed(1)}s" repeatCount="indefinite"/>`;
      // red spin flash on hot
      const spin = hot ? `<circle cx="${cx}" cy="${cy.toFixed(1)}" r="${(r + 3).toFixed(1)}" fill="none" stroke="var(--red)" stroke-width="1" stroke-dasharray="3 9" opacity=".7">
        <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy.toFixed(1)}" to="360 ${cx} ${cy.toFixed(1)}" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="pa-weed${hot ? " hot" : ""}">
        ${wobble}${twigs}${ball}${spin}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="pa-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="pa-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // skyline ridge behind
    const ridge = `<path d="M 0 ${GY - 40} Q 80 ${GY - 55} 160 ${GY - 46} T 320 ${GY - 50} T 400 ${GY - 44} L 400 ${GY} L 0 ${GY} Z" fill="color-mix(in srgb, #4a3a26 30%, transparent)" opacity=".55"/>`;

    // gauchos — sessions riding the skyline
    const riders = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 20 - (s.tps || 0) / 10);
      const y = GY - 52 - (i % 2) * 8;
      const size = 3.5 + Math.min(3, (s.tokens || 0) / 60000);
      return `<g class="pa-rider${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24} ${y.toFixed(1)};${W + 24} ${(y + 3).toFixed(1)}" dur="${dur}s" begin="${(-i * 3.2).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .8}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <path d="M ${size * 1.3} ${-size * .5} L ${size * 1.9} ${-size * 1.5} L ${size * 2.3} ${-size * 1.2} L ${size * 1.8} ${-size * .1} Z" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <circle cx="${size * 2.15}" cy="${-size * 1.35}" r="${size * .38}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <ellipse cx="${-size * .3}" cy="${-size * 1.6}" rx="${size * .55}" ry="${size * .35}" fill="${dead ? "var(--red)" : "#5a4632"}"/>
        <rect x="${-size * .7}" y="${-size * 2.1}" width="${size * .9}" height="${size * .5}" fill="#5a4632"/>
        <line x1="${-size * .9}" y1="${size * .7}" x2="${-size * .9}" y2="${size * 1.8}" stroke="#4a3a26" stroke-width="1.2"/>
        <line x1="${size * .9}" y1="${size * .7}" x2="${size * .9}" y2="${size * 1.8}" stroke="#4a3a26" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pa-wrap">
        <div class="pa-head"><b>PAMPA</b><span>草=配额窗 径=用量 仔=会话${hotN ? " · " + hotN + " 草旋" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #241a10 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c9a86a" opacity=".4"/>
          ${ridge}${weeds}${riders}
          <g class="pa-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pa-k">${fmt(k.tokens)} · ${sessions.length} 仔</text>
            <text x="22" y="45" class="pa-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潘帕斯", eyebrow: "PAMPA", render };
})();
