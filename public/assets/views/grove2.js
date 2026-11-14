/* -------------------------------------------------------------------- grove2
 * Grove II — a coppice of hazels: every quota window is a
 * stool (new rods + bird = used%, ≥85% the basket burns
 * amber); sessions are coppicers (a billhook + glove)
 * cutting the rods.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "grove2";
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

    const stools = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#80a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const stoolY = floorY - 12;
      // rods = f
      const rods = Array.from({ length: Math.round(3 + f * 5) }, (_, ri) => {
        const rh = 14 + f * 8 - ri * 1.5;
        const rx = x - 6 + ri * 4;
        return `<line x1="${rx.toFixed(1)}" y1="${stoolY}" x2="${rx.toFixed(1)}" y2="${stoolY - rh}" stroke="${col}" stroke-width="1.5" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // bird
      const bird = hot ? `<circle cx="${x + 10}" cy="${stoolY - 14}" r="2" fill="var(--amber)">
          <animate attributeName="cy" values="${stoolY - 14};${stoolY - 18};${stoolY - 14}" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      // basket when hot
      const basket = hot ? `<ellipse cx="${x - 10}" cy="${stoolY - 4}" rx="4" ry="3" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="gq-stool${hot ? " hot" : ""}">
        <ellipse cx="${x}" cy="${stoolY + 4}" rx="8" ry="3" fill="#3a2a18"/>
        ${rods}${bird}${basket}
        <text x="${x}" y="${stoolY - 26}" class="gq-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${stoolY + 12}" class="gq-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // coppicers — billhook + glove
    const coppicers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="gq-cop${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L10 -10 L12 -8" stroke="${col}" stroke-width="1.5" fill="none"/>
        <circle cx="10" cy="-8" r="1.5" fill="var(--amber)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gq-wrap">
        <div class="gq-head"><b>GROVE II</b><span>丛=配额窗 条=用量 篮=过热 砍柴=会话${hotN ? " · " + hotN + " 伐" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141410" rx="10"/>
          ${stools}${coppicers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="gq-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gq-ksub" text-anchor="end">丛=萌蘖</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "树丛二号", eyebrow: "GROVE II", render };
})();
