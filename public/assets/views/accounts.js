/* ------------------------------------------------------------------ accounts
 * Accounts — every provider account as a ledger card: avatar
 * dot = provider colour, two quota-window bars (name · %),
 * balance line, and a sessions-count chip. Cards sort by
 * hottest window; over-85% accounts get an amber frame.
 * Sessions are seals stamping the ledger.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "accounts";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const sessByProv = {};
    sessions.forEach(s => {
      const p = s.provider || "?";
      sessByProv[p] = (sessByProv[p] || 0) + 1;
    });

    const cards = quotas.map(q => {
      const wins = (q.windows || []).slice(0, 2);
      const hot = Math.max(...wins.map(w => w.used || 0), 0);
      const m = metaOf(pmeta, q.provider);
      return { ...q, wins, hot, col: m.color || "#8ab4f8", name: m.name || q.provider, sess: sessByProv[q.provider] || 0 };
    }).sort((a, b) => b.hot - a.hot).slice(0, 6);

    const W = 400, H = 300, TOP = 36, BOT = 40;
    const rows = Math.ceil(cards.length / 2);
    const cardH = Math.min(74, (H - TOP - BOT) / rows);
    const cardW = (W - 32) / 2;

    const grid = cards.map((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 10 + col * (cardW + 12);
      const y = TOP + row * (cardH + 6);
      const isHot = c.hot >= 85;
      const bars = c.wins.map((w, wi) => {
        const by = y + 30 + wi * 16;
        const pct = Math.min(100, w.used || 0);
        const wcol = pct >= 85 ? "var(--amber)" : pct >= 60 ? "#e0a040" : "var(--accent)";
        return `<text x="${x + 10}" y="${by - 2}" class="an-win">${esc(String(w.name || "窗").slice(0, 6))} ${Math.round(pct)}%</text>
          <rect x="${x + 10}" y="${by}" width="${cardW - 46}" height="5" rx="2.5" fill="var(--line-2)" opacity=".5"/>
          <rect x="${x + 10}" y="${by}" width="${(cardW - 46) * pct / 100}" height="5" rx="2.5" fill="${wcol}"/>`;
      }).join("");
      const balance = c.balance ? `<text x="${x + cardW - 10}" y="${y + 18}" class="an-bal" text-anchor="end">${esc(c.balance)}</text>` : "";
      const seal = c.sess ? `<g class="an-seal"><circle cx="${x + cardW - 22}" cy="${y + cardH - 18}" r="9" fill="${c.col}" opacity=".85"/>
        <text x="${x + cardW - 22}" y="${y + cardH - 14}" class="an-sealn" text-anchor="middle">${c.sess}</text></g>` : "";
      return `<g class="an-card${isHot ? " hot" : ""}">
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="8"
          fill="var(--card-2)" stroke="${isHot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${isHot ? 1.4 : .8}"/>
        <circle cx="${x + 14}" cy="${y + 15}" r="4" fill="${c.col}"/>
        <text x="${x + 24}" y="${y + 18}" class="an-name">${esc(c.name.slice(0, 9))}</text>
        ${balance}
        <text x="${x + 10}" y="${y + 26}" class="an-user">${esc((c.user || c.plan || "").slice(0, 16))}</text>
        ${bars}${seal}
        ${isHot ? `<circle cx="${x + cardW - 10}" cy="${y + 10}" r="4" fill="var(--amber)">
          <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = cards.filter(c => c.hot >= 85).length;

    host.innerHTML = `
      <div class="an-wrap">
        <div class="an-head"><b>ACCOUNTS</b><span>${cards.length} 账户${hotN ? " · ⚠ " + hotN + " 热窗" : " · 全绿"}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${grid}
          <text x="16" y="${H - 18}" class="an-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="an-ksub" text-anchor="end">圆印=会话数 · 琥珀框=热窗</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "账户", eyebrow: "ACCOUNTS", render };
})();
