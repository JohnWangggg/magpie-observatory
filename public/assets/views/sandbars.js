/* ------------------------------------------------------------------ sandbars
 * Sandbars — exposed mid-river bars at low water: every
 * quota window is a bar whose length = used % (≥85% the
 * driftwood flag burns amber); sessions are oystercatchers
 * piping along the edge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sandbars";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(21882244);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 195, GY = 250;

    // river sky
    const sky = `<defs><linearGradient id="sb-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8ccd8"/><stop offset="100%" stop-color="#d8e0d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sb-s)" rx="10"/>`;
    // far bank
    const farBank = `<path d="M 0 ${WY} L 0 ${WY - 28} Q 100 ${WY - 42} 200 ${WY - 32} Q 300 ${WY - 44} 400 ${WY - 35} L 400 ${WY} Z" fill="color-mix(in srgb, #688858 60%, var(--card-2))"/>`;
    // river
    const river = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #5898a8 58%, var(--card-2))"/>`;
    // current lines
    let currents = "";
    for (let i = 0; i < 7; i++) {
      currents += `<path d="M ${(rnd() * W).toFixed(1)} ${(WY + 8 + rnd() * 45).toFixed(1)} q 18 ${(rnd() * 3 - 1).toFixed(1)} 36 ${(rnd() * 3 - 1).toFixed(1)}" stroke="#a8d0dc" stroke-width=".7" fill="none" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // near bank
    const nearBank = `<path d="M 0 ${GY} L 0 ${GY - 8} L 60 ${GY - 14} L 130 ${GY - 6} L 200 ${GY - 15} L 270 ${GY - 8} L 340 ${GY - 13} L 400 ${GY - 10} L 400 ${GY} Z" fill="color-mix(in srgb, #a89068 60%, var(--card-2))"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #988058 60%, var(--card-2))"/>`;

    // sandbars — length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const bars = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = WY + (GY - WY) * .5;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d0b888";
      const bl = 14 + f * 30;
      const bh = 4 + f * 7;
      // bar — elongated lens shape
      const bar = `<ellipse cx="${cx}" cy="${cy}" rx="${bl}" ry="${bh}" fill="color-mix(in srgb, ${col} 75%, #b09868)"/>`;
      // dry top
      const top = `<ellipse cx="${cx}" cy="${cy - bh * .3}" rx="${bl * .85}" ry="${bh * .55}" fill="color-mix(in srgb, ${col} 90%, #d8c8a0)"/>`;
      // water lap lines
      const lap = `<ellipse cx="${cx}" cy="${cy + bh * .5}" rx="${bl * 1.15}" ry="${bh * .4}" fill="none" stroke="#a8d0dc" stroke-width=".7" opacity=".5"/>`;
      // driftwood with flag
      const wood = `<path d="M ${cx - 6} ${cy - bh} L ${cx + 8} ${cy - bh - 3}" stroke="#685848" stroke-width="2" stroke-linecap="round"/>`;
      const flag = `<path d="M ${cx + 8} ${cy - bh - 3} L ${cx + 8} ${cy - bh - 12} L ${cx + 15} ${cy - bh - 9} L ${cx + 8} ${cy - bh - 7} Z" fill="${hot ? "var(--amber)" : "#a05040"}"/>`;
      const glow = hot ? `<circle cx="${cx + 9}" cy="${cy - bh - 9}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="sb-bar${hot ? " hot" : ""}">
        ${lap}${bar}${top}${wood}${flag}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sb-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sb-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // oystercatchers — piping along the edge
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length)) - 10;
      const y = WY + (GY - WY) * .5 - 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#283038");
      const rx2 = 10 + rnd() * 8;
      return `<g class="sb-oyst${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} L ${(cx2 + rx2).toFixed(1)} ${y} L ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .45}" fill="${col}"/>
        <ellipse cx="${-size * .1}" cy="${size * .05}" rx="${size * .4}" ry="${size * .25}" fill="#e8e8e0"/>
        <circle cx="${size * .65}" cy="${-size * .2}" r="${size * .3}" fill="${col}"/>
        <line x1="${size * .85}" y1="${-size * .15}" x2="${size * 1.7}" y2="${size * .1}" stroke="#e08030" stroke-width="1" opacity=".9"/>
        <line x1="0" y1="${size * .4}" x2="-.5" y2="${size * 1.1}" stroke="#e08030" stroke-width=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sb-wrap">
        <div class="sb-head"><b>SANDBARS</b><span>沙洲=配额窗 长=用量 蛎鹬=会话${hotN ? " · " + hotN + " 燃标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${farBank}${river}${currents}${nearBank}${ground}${bars}${birds}
          <g class="sb-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sb-k">${fmt(k.tokens)} · ${sessions.length} 鹬</text>
            <text x="22" y="45" class="sb-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沙洲", eyebrow: "SANDBARS", render };
})();
