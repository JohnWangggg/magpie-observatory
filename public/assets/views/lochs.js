/* ------------------------------------------------------------------ lochs
 * Lochs — still Highland lochs ringed by pines: every quota
 * window is an island whose tree height = used % (≥85% the
 * bothy fire burns amber); sessions are otters slipping
 * through the water.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lochs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44226688);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 190, GY = 248;

    // misty scottish sky
    const sky = `<defs><linearGradient id="lu-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8b8c8"/><stop offset="100%" stop-color="#c8d0d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#lu-s)" rx="10"/>`;
    // far hills
    const hills = `<path d="M 0 ${WY} L 0 ${WY - 45} L 60 ${WY - 60} L 130 ${WY - 40} L 200 ${WY - 65} L 270 ${WY - 48} L 340 ${WY - 60} L 400 ${WY - 55} L 400 ${WY} Z" fill="#7890a8" opacity=".35"/>`;
    // water
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #486878 65%, var(--card-2))"/>`;
    // ripples
    let ripples = "";
    for (let i = 0; i < 6; i++) {
      ripples += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(WY + 10 + rnd() * 40).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(WY + 10 + rnd() * 40).toFixed(1)}" stroke="#88a8b8" stroke-width=".7" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #586858 60%, var(--card-2))"/>`;

    // islands — tree height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const isles = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#486858";
      const th = 15 + f * 55;
      const iw = 12 + f * 20;
      const topY = WY + 15;
      // island mound
      const mound = `<ellipse cx="${cx}" cy="${topY}" rx="${iw / 2}" ry="${(iw * .2).toFixed(1)}" fill="color-mix(in srgb, ${col} 60%, #485048)"/>`;
      // pine trees — height = used %
      const pine1 = `<path d="M ${cx - iw * .2} ${topY - 2} L ${cx - iw * .2 - 3} ${topY - th * .4} L ${cx - iw * .2 + 3} ${topY - th * .4} Z" fill="color-mix(in srgb, ${col} 65%, #385040)"/>
        <path d="M ${cx - iw * .2} ${topY - th * .35} L ${cx - iw * .2 - 2} ${topY - th * .75} L ${cx - iw * .2 + 2} ${topY - th * .75} Z" fill="color-mix(in srgb, ${col} 70%, #405848)"/>`;
      const pine2 = `<path d="M ${cx + iw * .2} ${topY - 2} L ${cx + iw * .2 - 2.5} ${topY - th * .5} L ${cx + iw * .2 + 2.5} ${topY - th * .5} Z" fill="color-mix(in srgb, ${col} 60%, #385040)"/>`;
      // bothy (stone hut)
      const bothy = `<rect x="${cx - 4}" y="${topY - 8}" width="8" height="6" fill="#686868"/><path d="M ${cx - 5} ${topY - 8} L ${cx} ${topY - 11} L ${cx + 5} ${topY - 8} Z" fill="#585858"/>`;
      // hot amber fire in the bothy window
      const fire = hot ? `<rect x="${cx - 1}" y="${topY - 6}" width="2.5" height="3" fill="var(--amber)" opacity=".8">
        <animate attributeName="opacity" values=".8;.3;.8" dur="1.2s" repeatCount="indefinite"/></rect>` : "";
      // reflection
      const refl2 = `<ellipse cx="${cx}" cy="${topY + iw * .25 + 3}" rx="${iw * .35}" ry="${(iw * .08).toFixed(1)}" fill="${col}" opacity=".15"/>`;
      return `<g class="lu-isle${hot ? " hot" : ""}">
        ${mound}${pine1}${pine2}${bothy}${fire}${refl2}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="lu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="lu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // otters — slipping through the water
    const otters = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = WY + 30 + (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#685038");
      return `<g class="lu-otter${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .4}" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .2}" r="${size * .35}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 Q ${-size * 1.8} ${size * .3} ${-size * 2.2} ${-size * .2}" stroke="${col}" stroke-width="1" fill="none"/>
        <path d="M ${size * .6} ${size * .3} Q ${size * .3} ${size * .8} ${-size * .2} ${size * .7}" stroke="${col}" stroke-width=".6" fill="none" opacity=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lu-wrap">
        <div class="lu-head"><b>LOCHS</b><span>岛=配额窗 树高=用量 水獭=会话${hotN ? " · " + hotN + " 燃炉" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hills}${water}${ripples}${shore}${isles}${otters}
          <g class="lu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="lu-k">${fmt(k.tokens)} · ${sessions.length} 獭</text>
            <text x="22" y="45" class="lu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湖群", eyebrow: "LOCHS", render };
})();
