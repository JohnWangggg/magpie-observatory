/* -------------------------------------------------------------- nightmarket
 * Nightmarket — a row of glowing stalls under a dark street:
 * every quota window is a stall with a striped awning and a
 * glowing sign (used% = lamp brightness, ≥85% flickers amber);
 * sessions are lantern-carrying shoppers walking the street.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nightmarket";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 40, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    const stalls = quotas.map((w, i) => {
      const x = 12 + i * bw;
      const y = TOP;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#f0c060";
      const hot = w.used >= 85;
      const glow = Math.min(1, w.used / 100);
      const stallW = bw - 8;
      // striped awning
      const stripes = Array.from({ length: 5 }, (_, s) => {
        const sx = x + 4 + s * (stallW / 5);
        const fill = s % 2 ? col : "var(--card-2)";
        return `<rect x="${sx.toFixed(1)}" y="${y}" width="${(stallW / 5).toFixed(1)}" height="10" fill="${fill}" opacity="${s % 2 ? .95 : 1}"/>`;
      }).join("");
      const signY = y + 22;
      const glowO = (0.25 + glow * 0.75).toFixed(2);
      return `<g class="nm-stall${hot ? " hot" : ""}">
        ${stripes}
        <rect x="${x + 4}" y="${y + 10}" width="${stallW}" height="${bh - 10}" rx="2" fill="#161d24" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x + 10}" y="${signY}" width="${stallW - 12}" height="14" rx="3" fill="${col}" opacity="${glowO}">
          ${hot ? `<animate attributeName="opacity" values="${glowO};.4;${glowO}" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </rect>
        <text x="${x + 10 + (stallW - 12) / 2}" y="${signY + 10}" class="nm-sign" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x + bw / 2 - 4}" y="${y + bh - 10}" class="nm-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + stallW}" cy="${y + 8}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // lantern shoppers
    const shoppers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0a060");
      const dur = Math.max(11, 22 - (s.tps || 0) / 8);
      const y = TOP + bh - 4 - (i % 2) * 4;
      return `<g class="nm-shopper${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3" fill="${col}"/>
        <rect x="-3" y="-5" width="6" height="8" rx="2" fill="${col}" opacity=".85"/>
        <line x1="3" y1="-4" x2="7" y2="-9" stroke="${col}" stroke-width="1"/>
        <circle cx="8" cy="-10" r="3.5" fill="#f0d090" opacity=".9">
          <animate attributeName="opacity" values=".9;.6;.9" dur="2s" repeatCount="indefinite"/></circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="nm-wrap">
        <div class="nm-head"><b>NIGHTMARKET</b><span>摊位=配额窗 灯牌=用量 提灯客=会话${hotN ? " · " + hotN + " 闪灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0c1218" rx="10"/>
          ${stalls}${shoppers}
          <line x1="0" y1="${TOP + bh + 6}" x2="${W}" y2="${TOP + bh + 6}" stroke="#1d2830" stroke-width="2"/>
          <text x="16" y="${H - 18}" class="nm-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="nm-ksub" text-anchor="end">条棚=摊顶</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "夜市", eyebrow: "NIGHTMARKET", render };
})();
