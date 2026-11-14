/* -------------------------------------------------------------------- bowyer
 * Bowyer — a stave rack of bow limbs: every quota window is a
 * strung bow (limb curve + string tension = used%, ≥85% the
 * nock burns amber); sessions are bowyers (a cap + drawknife)
 * tillering the limbs.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bowyer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 54, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const bows = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bowY = floorY - 14;
      const bowH = 40;
      const curve = 6 + f * 14;
      const stringW = 4 + f * 8;
      return `<g class="bp-bow${hot ? " hot" : ""}">
        <!-- rack -->
        <line x1="${x - bw / 2 + 8}" y1="${bowY}" x2="${x + bw / 2 - 8}" y2="${bowY}" stroke="#3a3028" stroke-width="2"/>
        <!-- bow limb — upper -->
        <path d="M${x} ${bowY - bowH / 2} Q${x + curve / 2} ${bowY - bowH / 4} ${x + curve} ${bowY - bowH / 2 + 8}" fill="none" stroke="#5a4028" stroke-width="3" stroke-linecap="round"/>
        <!-- bow limb — lower -->
        <path d="M${x} ${bowY + bowH / 2} Q${x + curve / 2} ${bowY + bowH / 4} ${x + curve} ${bowY + bowH / 2 - 8}" fill="none" stroke="#5a4028" stroke-width="3" stroke-linecap="round"/>
        <!-- grip -->
        <rect x="${x - 3}" y="${bowY - 6}" width="6" height="12" rx="2" fill="${col}"/>
        <!-- string -->
        <line x1="${x + curve}" y1="${bowY - bowH / 2 + 8}" x2="${x + curve}" y2="${bowY + bowH / 2 - 8}" stroke="${col}" stroke-width="${(1 + f).toFixed(1)}" opacity=".8">
          ${hot ? `<animate attributeName="stroke-width" values="${(1 + f).toFixed(1)};${(1.5 + f).toFixed(1)};${(1 + f).toFixed(1)}" dur="1.2s" repeatCount="indefinite"/>` : ""}
        </line>
        <!-- nocks -->
        <circle cx="${x + curve}" cy="${bowY - bowH / 2 + 8}" r="2.5" fill="${hot ? "var(--amber)" : col}"/>
        <circle cx="${x + curve}" cy="${bowY + bowH / 2 - 8}" r="2.5" fill="${hot ? "var(--amber)" : col}"/>
        <text x="${x - 8}" y="${bowY + 4}" class="bp-num" text-anchor="end">${Math.round(w.used)}%</text>
        <text x="${x - 8}" y="${bowY + 14}" class="bp-name" text-anchor="end">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // bowyers — cap + drawknife
    const bowyers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="bp-bowyer${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L10 -8 L9 -11 L3 -7 Z" fill="#384048"/>
        <circle cx="10" cy="-9" r="2" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bp-wrap">
        <div class="bp-head"><b>BOWYER</b><span>弓架=配额窗 弧弯=用量 弦扣=过热 弓匠=会话${hotN ? " · " + hotN + " 满弦" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${bows}${bowyers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="bp-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="bp-ksub" text-anchor="end">弦=张力</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "弓匠坊", eyebrow: "BOWYER", render };
})();
