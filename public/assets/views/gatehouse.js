/* ------------------------------------------------------------------ gatehouse
 * Gatehouse — a fortified arch over a road: every quota window
 * is a portcullis bay (grille depth + torch = used%, ≥85% the
 * brazier burns amber); sessions are gatekeepers (a helm +
 * halberd) manning the pass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gatehouse";
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
    const roadY = TOP + bh;

    const bays = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bayY = roadY - 8;
      const bayW = bw - 16;
      const archH = 20 + f * 8;
      // portcullis grille = f
      const bars = Array.from({ length: Math.round(3 + f * 4) }, (_, bi) => {
        const bx = x - bayW / 2 + 5 + bi * (bayW - 10) / Math.max(1, Math.round(2 + f * 4));
        return `<line x1="${bx.toFixed(1)}" y1="${bayY - archH}" x2="${bx.toFixed(1)}" y2="${bayY - 2}" stroke="${col}" stroke-width="1" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // torch
      const torch = `<circle cx="${x + bayW / 2 - 4}" cy="${bayY - archH - 6}" r="2.5" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="2.5;4;2.5" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      // brazier
      const brazier = hot ? `<circle cx="${x - bayW / 2 + 4}" cy="${bayY - 2}" r="3" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="gk-bay${hot ? " hot" : ""}">
        <!-- wall -->
        <rect x="${x - bayW / 2 - 4}" y="${bayY - archH - 8}" width="${bayW + 8}" height="${archH + 10}" fill="#2a2820" stroke="${hot ? "var(--amber)" : "#4a4030"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- arch -->
        <path d="M${x - bayW / 2} ${bayY - 2} L${x - bayW / 2} ${bayY - archH} Q${x} ${bayY - archH - 8} ${x + bayW / 2} ${bayY - archH} L${x + bayW / 2} ${bayY - 2}" fill="#1a1814"/>
        ${bars}${torch}${brazier}
        <text x="${x}" y="${bayY - archH - 12}" class="gk-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${bayY + 12}" class="gk-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // gatekeepers — helm + halberd
    const keepers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#908070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = roadY - 6 - (i % 2) * 3;
      return `<g class="gk-keeper${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-2" y="-12" width="6" height="3" fill="#4a4038"/>
        <line x1="4" y1="-4" x2="4" y2="-14" stroke="${col}" stroke-width="1.2"/>
        <path d="M4 -14 L8 -12 M4 -14 L0 -12" stroke="${col}" stroke-width="1" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gk-wrap">
        <div class="gk-head"><b>GATEHOUSE</b><span>门洞=配额窗 栅深=用量 火盆=过热 守门=会话${hotN ? " · " + hotN + " 闭" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#161410" rx="10"/>
          ${bays}${keepers}
          <rect x="0" y="${roadY + 2}" width="${W}" height="${BOT - 2}" fill="#221c16"/>
          <text x="16" y="${H - 18}" class="gk-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gk-ksub" text-anchor="end">雉堞=城齿</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "门楼", eyebrow: "GATEHOUSE", render };
})();
