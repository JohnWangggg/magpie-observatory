/* ------------------------------------------------------------------ icebergs
 * Icebergs — blue-white bergs drifting in polar seas: every
 * quota window is a berg whose sail height = used % (≥85%
 * the sunlit facet burns amber); sessions are seals hauled
 * out on the floes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "icebergs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(24104466);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 195, GY = 250;

    // polar sky
    const sky = `<defs><linearGradient id="ib-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c0d8e8"/><stop offset="100%" stop-color="#e0ecf0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ib-s)" rx="10"/>`;
    // sea
    const sea = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #386888 65%, var(--card-2))"/>`;
    // sea shimmer
    let shim = "";
    for (let i = 0; i < 6; i++) {
      shim += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(WY + 8 + rnd() * 45).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(WY + 8 + rnd() * 45).toFixed(1)}" stroke="#98c0d8" stroke-width=".8" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore — pack ice
    const pack = `<path d="M 0 ${GY} L 0 ${GY - 8} L 60 ${GY - 14} L 130 ${GY - 6} L 200 ${GY - 15} L 270 ${GY - 8} L 340 ${GY - 13} L 400 ${GY - 10} L 400 ${GY} Z" fill="#d8e4e8" opacity=".7"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c8d8dc 65%, var(--card-2))"/>`;

    // icebergs — sail height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const bergs = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a8d0e0";
      const bh = 20 + f * 80;
      const bw = 15 + f * 25;
      const topY = WY - bh;
      // faceted berg
      const body = `<path d="M ${cx - bw / 2} ${WY + 5} L ${cx - bw * .35} ${topY + 15} L ${cx - bw * .1} ${topY} L ${cx + bw * .25} ${topY + 8} L ${cx + bw / 2} ${WY + 5} Z" fill="color-mix(in srgb, ${col} 80%, #98c0d8)"/>`;
      // sunlit facet
      const facet = `<path d="M ${cx - bw * .1} ${topY} L ${cx + bw * .25} ${topY + 8} L ${cx + bw * .1} ${topY + 30} L ${cx - bw * .15} ${topY + 22} Z" fill="${hot ? "var(--amber)" : "#e0f0f8"}" opacity="${hot ? ".75" : ".6"}"/>`;
      // underwater hint
      const under = `<path d="M ${cx - bw * .4} ${WY + 5} L ${cx} ${WY + 30} L ${cx + bw * .4} ${WY + 5} Z" fill="${col}" opacity=".2"/>`;
      // waterline ring
      const ring = `<ellipse cx="${cx}" cy="${WY + 5}" rx="${bw * .65}" ry="3" fill="none" stroke="#98c8dc" stroke-width=".8" opacity=".5"/>`;
      // hot pulse
      const glow = hot ? `<circle cx="${cx + bw * .05}" cy="${topY + 12}" r="${(5 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="${(5 + f * 3).toFixed(1)};${(9 + f * 4).toFixed(1)}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="2s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="ib-berg${hot ? " hot" : ""}">
        ${under}${body}${facet}${ring}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ib-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ib-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // seals — hauled out on floes
    const seals = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 12);
      const y = WY + 15 + (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#8898a8");
      const x0 = -20;
      const x1 = W + 20;
      return `<g class="ib-seal${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x0} ${y};${x1} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * 1}" cy="${-size * .3}" r="${size * .35}" fill="${col}"/>
        <path d="M ${-size * 1.2} ${size * .1} L ${-size * 1.9} ${-size * .4} L ${-size * 1.7} ${size * .5} Z" fill="${col}"/>
        <path d="M ${size * .4} ${size * .3} L ${size * .9} ${size * .8}" stroke="${col}" stroke-width=".6" fill="none"/>
        <ellipse cx="${size * 1.1}" cy="${-size * .35}" rx="${size * .1}" ry="${size * .06}" fill="#283038"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ib-wrap">
        <div class="ib-head"><b>ICEBERGS</b><span>冰山=配额窗 帆高=用量 海豹=会话${hotN ? " · " + hotN + " 燃面" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${shim}${pack}${ground}${bergs}${seals}
          <g class="ib-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ib-k">${fmt(k.tokens)} · ${sessions.length} 豹</text>
            <text x="22" y="45" class="ib-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰山群", eyebrow: "ICEBERGS", render };
})();
