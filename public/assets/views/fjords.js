/* ------------------------------------------------------------------ fjords
 * Fjords — steep cliff walls plunging into still water: every
 * quota window is a fjord wall whose height = used % (≥85% the
 * summit snow burns amber); sessions are eagles soaring the
 * thermals.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fjords";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33115577);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 215, GY = 250;

    // nordic sky
    const sky = `<defs><linearGradient id="fs-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#98a8c0"/><stop offset="100%" stop-color="#c0ccd8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fs-s)" rx="10"/>`;
    // water — dark fjord
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #386078 70%, var(--card-2))"/>`;
    // still reflections
    let refl = "";
    for (let i = 0; i < 6; i++) {
      refl += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(WY + 8 + rnd() * 25).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(WY + 8 + rnd() * 25).toFixed(1)}" stroke="#7aa0b8" stroke-width=".8" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }
    // shore rocks
    const shore = `<path d="M 0 ${GY} L 0 ${GY - 8} L 50 ${GY - 12} L 120 ${GY - 6} L 200 ${GY - 14} L 280 ${GY - 8} L 360 ${GY - 12} L 400 ${GY - 10} L 400 ${GY} Z" fill="#585858" opacity=".5"/>`;

    // fjord walls — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;
    const walls = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#687888";
      const wh = 30 + f * 120;
      const ww = 14 + f * 24;
      const topY = WY - wh;
      // cliff face — sheer
      const face = `<path d="M ${cx - ww / 2} ${WY} L ${cx - ww * .4} ${topY + 10} L ${cx} ${topY} L ${cx + ww * .4} ${topY + 8} L ${cx + ww / 2} ${WY} Z" fill="color-mix(in srgb, ${col} 55%, #4a5a68)"/>`;
      // snow cap
      const snow = `<path d="M ${cx - ww * .3} ${topY + 14} L ${cx} ${topY + 2} L ${cx + ww * .3} ${topY + 12} L ${cx + ww * .15} ${topY + 22} L ${cx - ww * .15} ${topY + 22} Z" fill="#e8f0f8" opacity="${hot ? ".95" : ".55"}"/>`;
      // waterfall thread
      const fall = f > .3 ? `<line x1="${cx + ww * .1}" y1="${topY + 18}" x2="${cx + ww * .05}" y2="${WY - 2}" stroke="#c8e0f0" stroke-width="1" opacity=".5" stroke-dasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="0;7" dur="1.2s" repeatCount="indefinite"/></line>` : "";
      // hot amber summit
      const glow = hot ? `<circle cx="${cx}" cy="${topY + 4}" r="${(4 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".55">
        <animate attributeName="r" values="${(4 + f * 3).toFixed(1)};${(7 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".55;.15" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // water reflection of the wall
      const wallRefl = `<path d="M ${cx - ww * .3} ${WY + 3} L ${cx} ${WY + 14} L ${cx + ww * .3} ${WY + 3} Z" fill="${col}" opacity=".15"/>`;
      return `<g class="fs-wall${hot ? " hot" : ""}">
        ${face}${snow}${fall}${glow}${wallRefl}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="fs-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="fs-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // eagles — soaring the thermals
    const eagles = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = 45 + (i % 3) * 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#584838");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 50 + rnd() * 55;
      const ry2 = 12 + rnd() * 10;
      return `<g class="fs-eagle${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <path d="M ${-size * 1.6} ${-size * .3} Q ${-size * .4} ${size * .4} ${size * .8} 0 Q ${size * .5} ${-size * .7} ${-size * .5} ${-size * .3} Z" fill="${col}"/>
        <path d="M ${-size * 1.6} ${-size * .3} L ${-size * 1.9} ${-size * .9}" stroke="${col}" stroke-width=".8" fill="none"/>
        <path d="M ${size * .8} 0 L ${size * 1.4} ${-size * .3}" stroke="${col}" stroke-width=".6" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fs-wrap">
        <div class="fs-head"><b>FJORDS</b><span>峡壁=配额窗 高=用量 鹰=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${water}${refl}${shore}${walls}${eagles}
          <g class="fs-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fs-k">${fmt(k.tokens)} · ${sessions.length} 鹰</text>
            <text x="22" y="45" class="fs-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "峡湾", eyebrow: "FJORDS", render };
})();
