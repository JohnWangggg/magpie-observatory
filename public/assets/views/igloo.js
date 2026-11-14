/* -------------------------------------------------------------------- igloo
 * Igloo — a snowy field of dome huts under the aurora: every
 * quota window is an igloo (ice-block fill = used%, ≥85% the
 * doorway glows amber); sessions are travellers (head + parka)
 * sledding between domes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "igloo";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 46, BOT = 40;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // aurora band
    const aurora = `<path d="M0 30 Q 100 10 200 34 Q 300 58 400 26 L 400 0 L 0 0 Z" fill="#40e0a0" opacity=".12">
      <animate attributeName="d" values="M0 30 Q 100 10 200 34 Q 300 58 400 26 L 400 0 L 0 0 Z;M0 26 Q 100 38 200 24 Q 300 14 400 34 L 400 0 L 0 0 Z;M0 30 Q 100 10 200 34 Q 300 58 400 26 L 400 0 L 0 0 Z" dur="6s" repeatCount="indefinite"/></path>`;

    const domes = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0d0f0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const domeY = floorY - 8;
      const domeR = Math.min(bw / 2 - 8, 30);
      const doorW = domeR * .4, doorH = domeR * .55;
      // ice blocks — horizontal lines + glow fill
      const blocks = Array.from({ length: 4 }, (_, bi) => {
        const by = domeY - domeR * .15 - bi * (domeR * .2);
        const bw2 = domeR * 2 * Math.sqrt(1 - Math.pow((by - domeY + domeR) / domeR - 0, 2));
        return `<line x1="${(x - bw2 / 2).toFixed(1)}" y1="${by.toFixed(1)}" x2="${(x + bw2 / 2).toFixed(1)}" y2="${by.toFixed(1)}" stroke="#6a90a8" stroke-width=".8" opacity=".5"/>`;
      }).join("");
      return `<g class="ig-dome${hot ? " hot" : ""}">
        <!-- dome -->
        <path d="M${x - domeR} ${domeY} A ${domeR} ${domeR} 0 0 1 ${x + domeR} ${domeY} Z" fill="#c8e0f0" stroke="${hot ? "var(--amber)" : "#88a8c0"}" stroke-width="${hot ? 1.4 : 1}"/>
        ${blocks}
        <!-- doorway -->
        <path d="M${x - doorW / 2} ${domeY} L${x - doorW / 2} ${domeY - doorH} A ${doorW / 2} ${doorH / 2} 0 0 1 ${x + doorW / 2} ${domeY - doorH} L${x + doorW / 2} ${domeY} Z" fill="#0e1418"/>
        <path d="M${x - doorW / 2 + 2} ${domeY} L${x - doorW / 2 + 2} ${domeY - doorH + 4} A ${doorW / 2 - 2} ${doorH / 2 - 4} 0 0 1 ${x + doorW / 2 - 2} ${domeY - doorH + 4} L${x + doorW / 2 - 2} ${domeY} Z"
          fill="${hot ? "var(--amber)" : col}" opacity="${(0.3 + f * 0.6).toFixed(2)}"/>
        <text x="${x}" y="${domeY + 14}" class="ig-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${domeY + 23}" class="ig-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + domeR - 4}" cy="${domeY - 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // travellers — head + parka on sled
    const travellers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0c0a0");
      const dur = Math.max(13, 26 - (s.tps || 0) / 10);
      const y = floorY - 4 - (i % 2) * 3;
      return `<g class="ig-travel${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="2" rx="9" ry="2.5" fill="#2a3038"/>
        <circle cx="0" cy="-8" r="3.5" fill="${col}"/>
        <path d="M-4 -4 L4 -4 L5 2 L-5 2 Z" fill="${col}" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ig-wrap">
        <div class="ig-head"><b>IGLOO</b><span>冰屋=配额窗 门光=用量 旅人=会话${hotN ? " · " + hotN + " 暖屋" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0e1418" rx="10"/>
          ${aurora}${domes}${travellers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1a2428"/>
          <text x="16" y="${H - 18}" class="ig-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ig-ksub" text-anchor="end">极光=背景</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰屋", eyebrow: "IGLOO", render };
})();
