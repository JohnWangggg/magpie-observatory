/* ------------------------------------------------------------------ market2
 * Market II — a covered arcade of barrows: every quota
 * window is a fruit barrow (produce pile + scale = used%,
 * ≥85% the price flag burns amber); sessions are costermongers
 * (a apron + till) weighing the goods.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "market2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 58, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // arcade arches
    const arches = `<path d="M20 ${floorY - 30} Q ${W / 2} ${TOP - 20} ${W - 20} ${floorY - 30}" fill="none" stroke="#3a3028" stroke-width="1.5" opacity=".6"/>`;

    const barrows = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#80a050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const barrowY = floorY - 14;
      const barrowW = bw - 18;
      // produce pile = f
      const pile = `<ellipse cx="${x}" cy="${barrowY - 6}" rx="${barrowW / 2 - 4}" ry="${4 + f * 6}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // scale = f
      const scale = `<line x1="${x + barrowW / 2 + 4}" y1="${barrowY - 16}" x2="${x + barrowW / 2 + 4}" y2="${barrowY - 4}" stroke="#4a4038" stroke-width="1.5"/>
        <line x1="${x + barrowW / 2 + 4}" y1="${barrowY - 16}" x2="${x + barrowW / 2 + 8 - f * 6}" y2="${barrowY - 14}" stroke="#4a4038" stroke-width="1"/>
        <circle cx="${x + barrowW / 2 + 8 - f * 6}" cy="${barrowY - 14}" r="1.5" fill="${col}"/>`;
      // price flag when hot
      const flag = hot ? `<path d="M${x - barrowW / 2 - 4} ${barrowY - 18} L${x - barrowW / 2 - 4} ${barrowY - 8} L${x - barrowW / 2 - 10} ${barrowY - 12} Z" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></path>` : "";
      return `<g class="fu-barrow${hot ? " hot" : ""}">
        <!-- wheels -->
        <circle cx="${x - barrowW / 2 + 4}" cy="${barrowY}" r="3" fill="#2a3038"/>
        <circle cx="${x + barrowW / 2 - 4}" cy="${barrowY}" r="3" fill="#2a3038"/>
        <!-- cart -->
        <rect x="${x - barrowW / 2}" y="${barrowY - 8}" width="${barrowW}" height="8" rx="1" fill="#3a3028" stroke="${hot ? "var(--amber)" : "#4a3a28"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${pile}${scale}${flag}
        <text x="${x}" y="${barrowY - 20}" class="fu-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${barrowY + 12}" class="fu-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // costermongers — apron + till
    const mongers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="fu-monger${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-4" y="-5" width="8" height="5" fill="#4a3a30"/>
        <rect x="4" y="-4" width="8" height="5" fill="#6a5a40"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fu-wrap">
        <div class="fu-head"><b>MARKET II</b><span>货摊=配额窗 堆=用量 秤=过热 摊贩=会话${hotN ? " · " + hotN + " 秤" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${arches}${barrows}${mongers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="fu-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="fu-ksub" text-anchor="end">廊=拱廊</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "市场二号", eyebrow: "MARKET II", render };
})();
