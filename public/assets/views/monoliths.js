/* ------------------------------------------------------------------ monoliths
 * Monoliths — massive standing stones on a salt flat: every
 * quota window is a monolith whose height = used % (≥85% the
 * face glows amber); sessions are lizards darting between rocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "monoliths";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;

    // salt flat sky
    const sky = `<defs><linearGradient id="ma-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8b8a0"/><stop offset="100%" stop-color="#e0d0b8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ma-s)" rx="10"/>`;
    // distant range
    const range = `<path d="M 0 ${GY} L 0 ${GY - 20} L 60 ${GY - 35} L 130 ${GY - 18} L 200 ${GY - 40} L 270 ${GY - 22} L 340 ${GY - 35} L 400 ${GY - 28} L 400 ${GY} Z" fill="#b0a088" opacity=".3"/>`;
    // salt flat
    const flat = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #d0c8b0 70%, var(--card-2))"/>`;
    // salt cracks
    let cracks = "";
    for (let i = 0; i < 15; i++) {
      cracks += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#b0a890" stroke-width=".6" opacity="${(.15 + rnd() * .1).toFixed(2)}"/>`;
    }

    // monoliths — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const monoliths = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7a68";
      const mh = 30 + f * 85;
      const mw = 12 + f * 22;
      const topY = GY - mh;
      // monolith — tapered slab
      const body = `<path d="M ${cx - mw / 2} ${GY} L ${cx - mw * .35} ${topY} L ${cx + mw * .35} ${topY} L ${cx + mw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #b0a088)"/>`;
      // face striations
      const str1 = `<line x1="${cx - mw * .3}" y1="${GY - mh * .3}" x2="${cx + mw * .3}" y2="${GY - mh * .3}" stroke="${col}" stroke-width="1.5" opacity=".4"/>`;
      const str2 = `<line x1="${cx - mw * .28}" y1="${GY - mh * .6}" x2="${cx + mw * .28}" y2="${GY - mh * .6}" stroke="${col}" stroke-width="1.2" opacity=".35"/>`;
      const str3 = `<line x1="${cx - mw * .25}" y1="${GY - mh * .85}" x2="${cx + mw * .25}" y2="${GY - mh * .85}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // hot amber face
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY + 10}" rx="${mw * .4}" ry="${(8 + f * 5).toFixed(1)}" fill="var(--amber)" opacity=".5">
        <animate attributeName="ry" values="${(8 + f * 5).toFixed(1)};${(14 + f * 6).toFixed(1)}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ma-mono${hot ? " hot" : ""}">
        ${body}${str1}${str2}${str3}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ma-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ma-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // lizards — darting between rocks
    const lizards = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = GY + 10 + (i % 2) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#7a8a50");
      return `<g class="ma-liz${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 Q ${-size * 1.6} ${size * .4} ${-size * 1.4} ${size * .7}" stroke="${col}" stroke-width=".6" fill="none"/>
        <line x1="${-size * .8}" y1="${size * .2}" x2="${-size * 1.3}" y2="${size * .6}" stroke="${col}" stroke-width=".5"/>
        <line x1="${size * .8}" y1="${size * .2}" x2="${size * 1.3}" y2="${size * .6}" stroke="${col}" stroke-width=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ma-wrap">
        <div class="ma-head"><b>MONOLITHS</b><span>巨石=配额窗 高=用量 蜥蜴=会话${hotN ? " · " + hotN + " 燃面" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${range}${flat}${cracks}${monoliths}${lizards}
          <g class="ma-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ma-k">${fmt(k.tokens)} · ${sessions.length} 蜥</text>
            <text x="22" y="45" class="ma-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "巨石", eyebrow: "MONOLITHS", render };
})();
