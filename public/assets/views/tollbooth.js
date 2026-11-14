/* ------------------------------------------------------------------ tollbooth
 * Tollbooth — a plaza of coin baskets: every quota window is
 * a basket on a pole (coin fill + flag = used%, ≥85% the
 * change lamp burns amber); sessions are toll collectors
 * (a peaked cap + ledger) counting the fare.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tollbooth";
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

    const booths = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const boothY = floorY - 10;
      const basketW = bw - 20, basketH = 10;
      const poleH = 24 + f * 10;
      // coin fill = f
      const coins = Array.from({ length: Math.round(f * 6) }, (_, ci) => {
        const cx = x - basketW / 2 + 4 + (ci % 3) * (basketW - 8) / 2;
        const cy = boothY - 4 - Math.floor(ci / 3) * 3;
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5" fill="${col}" opacity=".8"/>`;
      }).join("");
      // flag
      const flag = `<path d="M${x + basketW / 2 + 4} ${boothY - poleH} L${x + basketW / 2 + 14} ${boothY - poleH + 3} L${x + basketW / 2 + 4} ${boothY - poleH + 6} Z" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </path>`;
      // change lamp
      const lamp = `<circle cx="${x - basketW / 2 - 4}" cy="${boothY - poleH + 4}" r="2" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="2;3;2" dur="1.2s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="tb-booth${hot ? " hot" : ""}">
        <!-- pole -->
        <line x1="${x + basketW / 2 + 4}" y1="${boothY}" x2="${x + basketW / 2 + 4}" y2="${boothY - poleH}" stroke="#4a4038" stroke-width="1.5"/>
        ${flag}
        <!-- lamp pole -->
        <line x1="${x - basketW / 2 - 4}" y1="${boothY}" x2="${x - basketW / 2 - 4}" y2="${boothY - poleH + 4}" stroke="#4a4038" stroke-width="1.5"/>
        ${lamp}
        <!-- basket -->
        <path d="M${x - basketW / 2} ${boothY} L${x + basketW / 2} ${boothY} L${x + basketW / 2 - 3} ${boothY + basketH} L${x - basketW / 2 + 3} ${boothY + basketH} Z" fill="#3a3028" stroke="${hot ? "var(--amber)" : "#5a4030"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${coins}
        <text x="${x}" y="${boothY - poleH - 6}" class="tb-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${boothY + basketH + 10}" class="tb-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // collectors — peaked cap + ledger
    const collectors = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#b09050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="tb-coll${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="2" y="-12" width="6" height="3" fill="#3a3028"/>
        <rect x="4" y="-6" width="8" height="5" fill="#d0c0a0"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tb-wrap">
        <div class="tb-head"><b>TOLLBOOTH</b><span>篮=配额窗 币堆=用量 帜=过热 收税=会话${hotN ? " · " + hotN + " 急" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#16120e" rx="10"/>
          ${booths}${collectors}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#201a14"/>
          <text x="16" y="${H - 18}" class="tb-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="tb-ksub" text-anchor="end">杆=帜柱</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "收费站", eyebrow: "TOLLBOOTH", render };
})();
