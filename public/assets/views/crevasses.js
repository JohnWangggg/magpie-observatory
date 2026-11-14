/* ------------------------------------------------------------------ crevasses
 * Crevasses — blue cracks yawning on a glacier face: every
 * quota window is a crevasse whose depth = used % (≥85% the
 * blue glow deep inside burns amber); sessions are climbers
 * roped along the lip.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crevasses";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(28548910);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 252;

    // high-altitude blue sky
    const sky = `<defs><linearGradient id="cd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7898c0"/><stop offset="100%" stop-color="#b0c8d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cd-s)" rx="10"/>`;
    // glacier face — white with a blue cast
    const face = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #d0e0e8 70%, var(--card-2))"/>`;
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b8ccd4 65%, var(--card-2))"/>`;

    // crevasses — depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const cracks = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7898b8";
      const cd = 12 + f * 40;
      const cw = 10 + f * 18;
      const topY = WY + 5;
      // crack — a narrowing V into the ice
      const crack = `<path d="M ${cx - cw / 2} ${topY} L ${cx} ${topY + cd} L ${cx + cw / 2} ${topY} Z" fill="color-mix(in srgb, ${col} 50%, #2a4058)"/>`;
      // inner glow — deep blue
      const inner = `<path d="M ${cx - cw * .25} ${topY + cd * .4} L ${cx} ${topY + cd} L ${cx + cw * .25} ${topY + cd * .4} Z" fill="#1a3048" opacity=".7"/>`;
      // amber core when hot
      const glow = hot ? `<path d="M ${cx - cw * .15} ${topY + cd * .7} L ${cx} ${topY + cd} L ${cx + cw * .15} ${topY + cd * .7} Z" fill="var(--amber)" opacity=".7">
        <animate attributeName="opacity" values=".7;.2;.7" dur="1.8s" repeatCount="indefinite"/></path>` : "";
      // lip — jagged ice edge
      const lip = `<path d="M ${cx - cw / 2 - 2} ${topY} L ${cx - cw * .3} ${topY - 2} L ${cx + cw * .3} ${topY - 2} L ${cx + cw / 2 + 2} ${topY}" stroke="#e8f0f4" stroke-width="1.5" fill="none"/>`;
      // bergschrund — the crack where glacier meets rock
      const berg = `<path d="M ${cx - cw} ${topY + cd} Q ${cx} ${topY + cd + 4} ${cx + cw} ${topY + cd}" stroke="#98b8c8" stroke-width=".8" fill="none" opacity=".5"/>`;
      return `<g class="cd-crack${hot ? " hot" : ""}">
        ${crack}${inner}${lip}${berg}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="cd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="cd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // climbers — roped along the lip
    const climbers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const y = WY + 3;
      const size = 2 + Math.min(1.8, (s.tokens || 0) / 90000);
      const col = dead ? "var(--red)" : (m.color || "#e0e8ec");
      // rope — a sagging line to the next climber
      const rope = i > 0 ? `<path d="M ${cx2 - 30} ${y} Q ${cx2 - 15} ${y + 8} ${cx2} ${y}" stroke="#c0d0d8" stroke-width=".8" fill="none" opacity=".6"/>` : "";
      return `<g class="cd-climb${dead ? " dead" : ""}">
        ${rope}
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M -6 0 L 6 -2 L -6 0"/>
        <circle cx="0" cy="${-size * .6}" r="${size * .4}" fill="${col}"/>
        <line x1="0" y1="${-size * .3}" x2="0" y2="${size * .5}" stroke="${col}" stroke-width=".8"/>
        <line x1="${-size * .4}" y1="${size * .5}" x2="0" y2="${size * 1.1}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * .4}" y1="${size * .5}" x2="0" y2="${size * 1.1}" stroke="${col}" stroke-width=".7"/>
        <path d="M 0 ${-size * .3} L ${size * .7} ${size * .2}" stroke="#e0a040" stroke-width=".5" fill="none" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cd-wrap">
        <div class="cd-head"><b>CREVASSES</b><span>裂隙=配额窗 深=用量 登山者=会话${hotN ? " · " + hotN + " 燃芯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${face}${shore}${cracks}${climbers}
          <g class="cd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cd-k">${fmt(k.tokens)} · ${sessions.length} 登</text>
            <text x="22" y="45" class="cd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰裂隙", eyebrow: "CREVASSES", render };
})();
