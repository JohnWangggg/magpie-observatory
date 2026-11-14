/* -------------------------------------------------------------------- lagoon
 * Lagoon — a calm turquoise bay: every quota window is a green islet
 * whose surrounding ripple rings grow outward as used % climbs
 * (≥85% the islet's beacon glows red); sessions are herons wading
 * between the islets.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lagoon";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55566719);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 218;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // islets — ripple rings expand with used %
    const islets = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5aa08a";
      const ir = 10 + f * 16;
      // expanding rings — count scales with used %
      const rings = Math.round(2 + f * 3);
      let rip = "";
      for (let r = 0; r < rings; r++) {
        rip += `<ellipse cx="${cx.toFixed(1)}" cy="${GY}" rx="${(ir + 8 + r * 12).toFixed(1)}" ry="${((ir + 8 + r * 12) * .32).toFixed(1)}" fill="none" stroke="${hot ? "var(--red)" : col}" stroke-width="1" opacity="${(.4 - r * .08).toFixed(2)}">
          <animate attributeName="rx" values="${(ir + 8).toFixed(1)};${(ir + 8 + rings * 12).toFixed(1)}" dur="${(2.5 + r * .6).toFixed(1)}s" begin="${(-r * .8).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".45;0" dur="${(2.5 + r * .6).toFixed(1)}s" begin="${(-r * .8).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
      }
      // islet body
      const islet = `<ellipse cx="${cx.toFixed(1)}" cy="${GY - 4}" rx="${ir.toFixed(1)}" ry="${(ir * .55).toFixed(1)}" fill="color-mix(in srgb, ${col} ${40 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1.2"/>`;
      // palm / beacon on hot
      const top = hot ? `<line x1="${cx}" y1="${GY - 4 - ir * .55}" x2="${cx}" y2="${GY - 4 - ir * .55 - 12}" stroke="#7a5a3a" stroke-width="1.4"/>
        <circle cx="${cx}" cy="${GY - 4 - ir * .55 - 14}" r="2.5" fill="var(--red)">
          <animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></circle>`
        : `<path d="M ${cx} ${GY - 4 - ir * .55} q 0 -6 -4 -8 M ${cx} ${GY - 4 - ir * .55} q 0 -7 5 -7 M ${cx} ${GY - 4 - ir * .55} q -2 -4 -6 -3 M ${cx} ${GY - 4 - ir * .55} q 2 -4 6 -2" stroke="#5a8a4a" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
      return `<g class="lg-islet${hot ? " hot" : ""}">
        ${rip}${islet}${top}
        <text x="${cx.toFixed(1)}" y="${GY + 28}" class="lg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 39}" class="lg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // herons — sessions wading
    const waders = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 18 - (s.tps || 0) / 8);
      const y = GY - 16 - (i % 3) * 18;
      const size = 3.5 + Math.min(4, (s.tokens || 0) / 50000);
      return `<g class="lg-heron${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.7).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .75}" fill="${dead ? "var(--red)" : m.color || "#c9d9e8"}"/>
        <path d="M ${size * .9} ${-size * .5} Q ${size * 1.9} ${-size * 1.6} ${size * 1.7} ${-size * 2.2}" stroke="${dead ? "var(--red)" : m.color || "#c9d9e8"}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="${size * 1.7}" cy="${-size * 2.2}" r="${size * .45}" fill="${dead ? "var(--red)" : m.color || "#c9d9e8"}"/>
        <line x1="${size * 2}" y1="${-size * 2.1}" x2="${size * 2.9}" y2="${-size * 2}" stroke="#d9a04a" stroke-width="1.2"/>
        <line x1="${-size * .4}" y1="${size * .6}" x2="${-size * .4}" y2="${size * 1.8}" stroke="#7a6a5a" stroke-width="1"/>
        <line x1="${size * .4}" y1="${size * .6}" x2="${size * .4}" y2="${size * 1.8}" stroke="#7a6a5a" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lg-wrap">
        <div class="lg-head"><b>LAGOON</b><span>岛=配额窗 环=用量 鹬=会话${hotN ? " · " + hotN + " 岛告警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #102428 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY - 8}" width="${W - 28}" height="${H - GY}" rx="4" fill="color-mix(in srgb, #2a7a8a 18%, transparent)" opacity=".5"/>
          ${islets}${waders}
          <g class="lg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="lg-k">${fmt(k.tokens)} · ${sessions.length} 鹬</text>
            <text x="22" y="45" class="lg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "环礁湖", eyebrow: "LAGOON", render };
})();
