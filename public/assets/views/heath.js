/* -------------------------------------------------------------------- heath
 * Heath — a purple moor in bloom: every quota window is a heather
 * clump whose flower bells thicken as used % climbs (≥85% the
 * clump flushes magenta); sessions are bees drifting between them.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "heath";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11235813);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 234;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // heather clumps — bell count = used %
    const clumps = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = hot ? "var(--red)" : (m.color || "#b579c9");
      const bells = 4 + Math.round(f * 9);
      let bloom = "";
      for (let b = 0; b < bells; b++) {
        const bx = cx - gap * .28 + rnd() * gap * .56;
        const bh = 10 + f * 44 + rnd() * 14;
        // tiny bell flower
        bloom += `<path d="M ${bx.toFixed(1)} ${GY} L ${bx.toFixed(1)} ${(GY - bh).toFixed(1)}" stroke="#4a6a3a" stroke-width=".8"/>
          <path d="M ${bx.toFixed(1)} ${(GY - bh).toFixed(1)} q -2.4 0 -2.4 -3 q 0 -2.4 2.4 -2.4 q 2.4 0 2.4 2.4 q 0 3 -2.4 3 Z"
            fill="${col}" opacity="${(0.6 + f * .3).toFixed(2)}"/>`;
      }
      // cushion base
      const base = `<ellipse cx="${cx}" cy="${GY}" rx="${(gap * .34).toFixed(1)}" ry="5" fill="color-mix(in srgb, #4a6a3a 55%, var(--card-2))"/>`;
      return `<g class="ht-clump${hot ? " hot" : ""}">
        ${base}${bloom}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ht-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ht-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // bees — sessions drifting
    const bees = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 15 - (s.tps || 0) / 9);
      const y = 66 + (i % 4) * 30 + rnd() * 14;
      const size = 2.8 + Math.min(3.5, (s.tokens || 0) / 50000);
      return `<g class="ht-bee${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${(y + 18).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.3).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .62}" fill="${dead ? "var(--red)" : "#e8c94a"}"/>
        <line x1="${-size * .3}" y1="${-size * .55}" x2="${-size * .3}" y2="${size * .55}" stroke="#3a2a1a" stroke-width="${size * .35}"/>
        <line x1="${size * .3}" y1="${-size * .55}" x2="${size * .3}" y2="${size * .55}" stroke="#3a2a1a" stroke-width="${size * .35}"/>
        <ellipse cx="${-size * .3}" cy="${-size * .8}" rx="${size * .5}" ry="${size * .34}" fill="#e8f0f8" opacity=".7">
          <animate attributeName="ry" values="${size * .34};${size * .12};${size * .34}" dur=".3s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="${size * .3}" cy="${-size * .8}" rx="${size * .5}" ry="${size * .34}" fill="#e8f0f8" opacity=".7">
          <animate attributeName="ry" values="${size * .12};${size * .34};${size * .12}" dur=".3s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ht-wrap">
        <div class="ht-head"><b>HEATH</b><span>丛=配额窗 铃=用量 蜂=会话${hotN ? " · " + hotN + " 丛红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1e1a24 44%, transparent)" rx="10"/>
          ${clumps}${bees}
          <g class="ht-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ht-k">${fmt(k.tokens)} · ${sessions.length} 蜂</text>
            <text x="22" y="45" class="ht-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石楠原", eyebrow: "HEATH", render };
})();
