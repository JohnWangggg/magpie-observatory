/* ------------------------------------------------------------------ kames
 * Kames — steep gravel mounds dumped at a glacier's edge:
 * every quota window is a kame whose steepness = used %
 * (≥85% the trig pillar on top burns amber); sessions are
 * red grouse bursting off the slopes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kames";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(32993354);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // heather moor sky
    const sky = `<defs><linearGradient id="km-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8a8b8"/><stop offset="100%" stop-color="#d0c8c8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#km-s)" rx="10"/>`;
    // moor
    const moor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #887888 55%, var(--card-2))"/>`;
    // heather tufts
    let heather = "";
    for (let i = 0; i < 16; i++) {
      heather += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 35).toFixed(1)}" r="${(1.2 + rnd() * 1.5).toFixed(1)}" fill="${["#a070a0", "#b080a0", "#9060a0"][i % 3]}" opacity="${(.5 + rnd() * .2).toFixed(2)}"/>`;
    }

    // kames — steepness = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const mounds = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#987880";
      const kh = 15 + f * 70;
      const kw = 22 - f * 8; // steeper = narrower
      const topY = GY - kh;
      // steep-sided mound
      const mound = `<path d="M ${cx - kw / 2} ${GY} L ${cx - kw * .3} ${topY + 8} L ${cx} ${topY} L ${cx + kw * .3} ${topY + 8} L ${cx + kw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 60%, #786060)"/>`;
      // gravel strata
      const strata = `<path d="M ${cx - kw * .3} ${topY + kh * .35} L ${cx + kw * .3} ${topY + kh * .35} M ${cx - kw * .35} ${topY + kh * .65} L ${cx + kw * .35} ${topY + kh * .65}" stroke="#584848" stroke-width=".6" opacity=".5"/>`;
      // trig pillar on top
      const trig = `<rect x="${cx - 2}" y="${topY - 7}" width="4" height="7" fill="${hot ? "var(--amber)" : "#e0d8c8"}"/>
        <polygon points="${cx - 2},${topY - 7} ${cx + 2},${topY - 7} ${cx},${topY - 10}" fill="${hot ? "var(--amber)" : "#e0d8c8"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${topY - 4}" r="7" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="km-mound${hot ? " hot" : ""}">
        ${mound}${strata}${trig}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="km-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="km-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // red grouse — bursting off the slopes
    const grouse = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const lvl = i % quotas.length || 0;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const y = GY - 20 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a05838");
      return `<g class="km-grouse${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${cx2} ${GY - 10} Q ${(cx2 + 20).toFixed(1)} ${(y - 15).toFixed(1)} ${(cx2 + 40).toFixed(1)} ${y.toFixed(1)} L ${cx2} ${GY - 10}"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .55}" cy="${-size * .3}" r="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .5} ${-size * .2} Q ${-size * 1.3} ${-size * .8} ${-size * 1.2} ${-size * .2}" stroke="${col}" stroke-width=".8" fill="none"/>
        <path d="M ${size * .4} ${-size * .1} Q ${size * 1} ${-size * .7} ${size * 1.3} ${-size * .3}" stroke="${col}" stroke-width=".7" fill="none" opacity=".8"/>
        <path d="M ${size * .5} ${-size * .45} L ${size * .8} ${-size * .6}" stroke="#e0a030" stroke-width="1" fill="none"/>
        <path d="M ${-size * .6} ${size * .2} L ${-size * 1} ${size * .5} L ${-size * .8} ${size * .2}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="km-wrap">
        <div class="km-head"><b>KAMES</b><span>冰砾阜=配额窗 陡=用量 松鸡=会话${hotN ? " · " + hotN + " 燃柱" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${moor}${heather}${mounds}${grouse}
          <g class="km-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="km-k">${fmt(k.tokens)} · ${sessions.length} 松鸡</text>
            <text x="22" y="45" class="km-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰砾阜", eyebrow: "KAMES", render };
})();
