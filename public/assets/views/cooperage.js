/* ----------------------------------------------------------------- cooperage
 * Cooperage — a yard of barrel jigs: every quota window is a
 * barrel (stave tightness + hoop glow = used%, ≥85% the bung
 * hole smokes amber); sessions are coopers (a cap + driver)
 * circling the barrels with hoops.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cooperage";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const barrels = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a07040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const barY = floorY - 12;
      const barW = bw - 20, barH = 40;
      const bulge = 2 + f * 4;
      // stave lines + hoops
      const staves = Array.from({ length: 5 }, (_, si) => {
        const sx = x - barW / 2 + 4 + si * ((barW - 8) / 4);
        return `<line x1="${sx.toFixed(1)}" y1="${barY - barH + 4}" x2="${sx.toFixed(1)}" y2="${barY - 4}" stroke="#3a2a18" stroke-width=".8" opacity=".7"/>`;
      }).join("");
      const hoops = Array.from({ length: 3 }, (_, hi) => {
        const hy = barY - barH + 6 + hi * (barH / 2 - 4);
        return `<line x1="${x - barW / 2 - 1}" y1="${hy.toFixed(1)}" x2="${x + barW / 2 + 1}" y2="${hy.toFixed(1)}" stroke="${hot ? "var(--amber)" : "#4a4038"}" stroke-width="${hot ? 1.5 : 1.2}" opacity="${hot ? .9 : .7}"/>`;
      }).join("");
      return `<g class="cx-barrel${hot ? " hot" : ""}">
        <!-- barrel silhouette -->
        <path d="M${x - barW / 2} ${barY - barH} Q${x - barW / 2 - bulge} ${barY - barH / 2} ${x - barW / 2} ${barY} L${x + barW / 2} ${barY} Q${x + barW / 2 + bulge} ${barY - barH / 2} ${x + barW / 2} ${barY - barH} Z"
          fill="#5a4028" stroke="${hot ? "var(--amber)" : "#3a2a18"}" stroke-width="${hot ? 1.4 : .8}"/>
        <ellipse cx="${x}" cy="${barY - barH}" rx="${barW / 2}" ry="4" fill="#4a3420"/>
        <ellipse cx="${x}" cy="${barY - barH}" rx="${barW / 2 - 4}" ry="2.5" fill="${col}" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>
        ${staves}${hoops}
        <!-- bung hole -->
        <circle cx="${x + barW / 4}" cy="${barY - barH / 2}" r="2.5" fill="#1a1208"/>
        ${hot ? `<circle cx="${x + barW / 4}" cy="${barY - barH / 2}" r="1.5" fill="var(--amber)">
          <animate attributeName="r" values="1.5;2.5;1.5" dur="1.4s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${barY + 14}" class="cx-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${barY + 23}" class="cx-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // coopers — cap + driver circling
    const coopers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="cx-cooper${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <circle cx="8" cy="-4" r="3" fill="#384048"/>
        <line x1="8" y1="-4" x2="8" y2="-8" stroke="${col}" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cx-wrap">
        <div class="cx-head"><b>COOPERAGE</b><span>木桶=配额窗 板缝=用量 桶箍=过热 箍匠=会话${hotN ? " · " + hotN + " 满桶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${barrels}${coopers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="cx-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="cx-ksub" text-anchor="end">鼓腹=陈桶</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "箍桶坊", eyebrow: "COOPERAGE", render };
})();
