/* ------------------------------------------------------------------ shipyard
 * Shipyard — a slipway of half-built hulls: every quota window
 * is a vessel on stocks (hull fill = used%, ≥85% the crane
 * hook glows amber); sessions are shipwrights (a cap + hammer)
 * riveting the plates.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shipyard";
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
    const groundY = TOP + bh;

    const slips = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#70a0c0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const slipY = groundY - 8;
      const slipW = bw - 14, slipH = 26;
      const hullFillH = slipH * f;
      // stocks — keel blocks under the hull
      const stocks = `<line x1="${x - slipW / 2 + 4}" y1="${slipY + 2}" x2="${x - slipW / 2 + 4}" y2="${slipY + 8}" stroke="#4a3828" stroke-width="2"/>
        <line x1="${x + slipW / 2 - 4}" y1="${slipY + 2}" x2="${x + slipW / 2 - 4}" y2="${slipY + 8}" stroke="#4a3828" stroke-width="2"/>`;
      return `<g class="sn-slip${hot ? " hot" : ""}">
        ${stocks}
        <!-- hull on stocks -->
        <path d="M${x - slipW / 2} ${slipY} Q${x - slipW / 2 - 4} ${slipY - slipH * .7} ${x - slipW / 4} ${slipY - slipH} L${x + slipW / 4} ${slipY - slipH} Q${x + slipW / 2 + 4} ${slipY - slipH * .7} ${x + slipW / 2} ${slipY} Z"
          fill="#3a3430" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : .8}"/>
        <clipPath id="sn-clip-${i}"><path d="M${x - slipW / 2} ${slipY} Q${x - slipW / 2 - 4} ${slipY - slipH * .7} ${x - slipW / 4} ${slipY - slipH} L${x + slipW / 4} ${slipY - slipH} Q${x + slipW / 2 + 4} ${slipY - slipH * .7} ${x + slipW / 2} ${slipY} Z"/></clipPath>
        <g clip-path="url(#sn-clip-${i})">
          <rect x="${x - slipW / 2}" y="${slipY - hullFillH}" width="${slipW}" height="${hullFillH.toFixed(1)}" fill="${col}" opacity=".8"/>
          <!-- plate lines -->
          ${Array.from({ length: 3 }, (_, pi) => `<line x1="${x - slipW / 2}" y1="${(slipY - (pi + 1) * slipH / 4).toFixed(1)}" x2="${x + slipW / 2}" y2="${(slipY - (pi + 1) * slipH / 4).toFixed(1)}" stroke="#1a2128" stroke-width=".8" opacity=".6"/>`).join("")}
        </g>
        <!-- crane hook -->
        <line x1="${x + slipW / 2 + 6}" y1="${TOP - 10}" x2="${x + slipW / 2 + 6}" y2="${slipY - slipH}" stroke="#384048" stroke-width="2"/>
        <path d="M${x + slipW / 2 + 3} ${slipY - slipH} L${x + slipW / 2 + 9} ${slipY - slipH} L${x + slipW / 2 + 6} ${slipY - slipH + 6} Z" fill="${hot ? "var(--amber)" : "#384048"}">
          ${hot ? `<animate attributeName="opacity" values="1;.5;1" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </path>
        <text x="${x}" y="${slipY + 18}" class="sn-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${slipY + 27}" class="sn-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // shipwrights — cap + hammer
    const wrights = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a880");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = groundY - 6 - (i % 2) * 3;
      return `<g class="sn-wright${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-10" stroke="${col}" stroke-width="1.5"/>
        <rect x="8" y="-13" width="3" height="4" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-head"><b>SHIPYARD</b><span>船台=配额窗 船体=用量 吊钩=过热 船匠=会话${hotN ? " · " + hotN + " 满造" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14181c" rx="10"/>
          ${slips}${wrights}
          <rect x="0" y="${groundY + 2}" width="${W}" height="${BOT - 2}" fill="#1a2228"/>
          <text x="16" y="${H - 18}" class="sn-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="sn-ksub" text-anchor="end">龙骨墩=枕木</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "造船厂", eyebrow: "SHIPYARD", render };
})();
