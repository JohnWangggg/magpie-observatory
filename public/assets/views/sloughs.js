/* ------------------------------------------------------------------ sloughs
 * Sloughs — marshy ponds dotting a prairie: every quota
 * window is a slough whose width = used % (≥85% the muskrat
 * lodge burns amber); sessions are redwings on the cattails.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sloughs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(15226688);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // prairie sky
    const sky = `<defs><linearGradient id="sq-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8d8c0"/><stop offset="100%" stop-color="#e8e8c8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sq-s)" rx="10"/>`;
    // distant grass sea
    const grassSea = `<path d="M 0 ${GY} L 0 ${GY - 25} Q 100 ${GY - 40} 200 ${GY - 30} Q 300 ${GY - 42} 400 ${GY - 32} L 400 ${GY} Z" fill="#a8b878" opacity=".35"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #98a868 55%, var(--card-2))"/>`;
    // grass tufts
    let tufts = "";
    for (let i = 0; i < 14; i++) {
      tufts += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + 4 + rnd() * 35).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + 2 + rnd() * 35).toFixed(1)}" stroke="#889858" stroke-width=".7" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }

    // sloughs — width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const ponds = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = GY - 25;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#487888";
      const sw = 16 + f * 30;
      const sd = 8 + f * 14;
      // pond
      const pond = `<ellipse cx="${cx}" cy="${cy}" rx="${sw / 2}" ry="${sd}" fill="color-mix(in srgb, ${col} 70%, #386060)"/>`;
      // inner water
      const inner = `<ellipse cx="${cx}" cy="${cy}" rx="${sw * .35}" ry="${sd * .6}" fill="color-mix(in srgb, ${col} 50%, #284848)" opacity=".7"/>`;
      // cattails — count = used %
      const catN = Math.round(2 + f * 5);
      let cats = "";
      for (let c = 0; c < catN; c++) {
        const cxx = cx - sw / 2 + (c + .5) * (sw / catN);
        const ch = 12 + rnd() * 10;
        cats += `<line x1="${cxx.toFixed(1)}" y1="${cy - sd * .5}" x2="${cxx.toFixed(1)}" y2="${cy - sd * .5 - ch}" stroke="#688048" stroke-width="1"/>
          <ellipse cx="${cxx.toFixed(1)}" cy="${cy - sd * .5 - ch}" rx="1.5" ry="4" fill="#785838"/>`;
      }
      // muskrat lodge
      const lodge = `<ellipse cx="${cx + sw * .3}" cy="${cy - 2}" rx="${4 + f * 3}" ry="${3 + f * 2}" fill="#685848" opacity=".8"/>`;
      // hot amber smoke from lodge
      const smoke = hot ? `<path d="M ${cx + sw * .3} ${cy - 8} Q ${cx + sw * .3 + 3} ${cy - 18} ${cx + sw * .3 + 1} ${cy - 26}" stroke="var(--amber)" stroke-width="1.2" fill="none" opacity=".6">
        <animate attributeName="opacity" values=".6;.15;.6" dur="2s" repeatCount="indefinite"/></path>` : "";
      return `<g class="sq-pond${hot ? " hot" : ""}">
        ${pond}${inner}${cats}${lodge}${smoke}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sq-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sq-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // redwings — on the cattails
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const y = GY - 25 - 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#282828");
      const rx2 = 10 + rnd() * 8;
      return `<g class="sq-wing${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} Q ${cx2} ${y - 15} ${(cx2 + rx2).toFixed(1)} ${y} Q ${cx2} ${y + 8} ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${-size * .2}" cy="${-size * .2}" rx="${size * .35}" ry="${size * .15}" fill="#c03030"/>
        <circle cx="${size * .6}" cy="${-size * .15}" r="${size * .25}" fill="${col}"/>
        <path d="M ${-size * .8} 0 L ${-size * 1.4} ${-size * .3} L ${-size * 1.4} ${size * .3} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sq-wrap">
        <div class="sq-head"><b>SLOUGHS</b><span>沼=配额窗 宽=用量 红翅鹂=会话${hotN ? " · " + hotN + " 燃窝" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${grassSea}${ground}${tufts}${ponds}${birds}
          <g class="sq-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sq-k">${fmt(k.tokens)} · ${sessions.length} 鹂</text>
            <text x="22" y="45" class="sq-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "池沼", eyebrow: "SLOUGHS", render };
})();
