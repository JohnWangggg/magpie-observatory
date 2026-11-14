/* -------------------------------------------------------------------- bazaar
 * Bazaar — a covered souk of stalls: every quota window is a
 * stall (awning stripe + lantern = used%, ≥85% the lantern
 * burns amber); sessions are merchants (a fez + tray) hawking
 * wares along the aisle.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bazaar";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 60, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // roof
    const roof = `<path d="M8 ${TOP - 6} L${W / 2} ${TOP - 26} L${W - 8} ${TOP - 6}" fill="none" stroke="#3a3028" stroke-width="2" opacity=".6"/>`;

    const stalls = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e0a040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const stallY = floorY - 10;
      const stallW = bw - 14;
      // awning stripes = f
      const stripes = Array.from({ length: Math.round(2 + f * 4) }, (_, si) => {
        const sx = x - stallW / 2 + 4 + si * (stallW - 8) / Math.max(1, Math.round(1 + f * 4));
        return `<line x1="${sx.toFixed(1)}" y1="${stallY - 30}" x2="${sx.toFixed(1)}" y2="${stallY - 22}" stroke="${col}" stroke-width="2" opacity=".8"/>`;
      }).join("");
      // lantern
      const lantern = `<circle cx="${x + stallW / 2 - 6}" cy="${stallY - 32}" r="3" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="3;4.5;3" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      // goods on counter
      const goods = `<rect x="${x - stallW / 2 + 4}" y="${stallY - 18}" width="${stallW - 8}" height="4" fill="${col}" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      return `<g class="bz-stall${hot ? " hot" : ""}">
        <!-- awning -->
        <path d="M${x - stallW / 2} ${stallY - 30} L${x + stallW / 2} ${stallY - 30} L${x + stallW / 2 - 4} ${stallY - 20} L${x - stallW / 2 + 4} ${stallY - 20} Z" fill="#3a3028"/>
        ${stripes}
        <!-- counter -->
        <rect x="${x - stallW / 2}" y="${stallY - 18}" width="${stallW}" height="18" rx="1" fill="#4a3a28"/>
        ${goods}
        <!-- posts -->
        <line x1="${x - stallW / 2 + 2}" y1="${stallY - 30}" x2="${x - stallW / 2 + 2}" y2="${stallY - 18}" stroke="#6a5030" stroke-width="1.5"/>
        <line x1="${x + stallW / 2 - 2}" y1="${stallY - 30}" x2="${x + stallW / 2 - 2}" y2="${stallY - 18}" stroke="#6a5030" stroke-width="1.5"/>
        ${lantern}
        <text x="${x}" y="${stallY - 22}" class="bz-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${stallY + 8}" class="bz-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // merchants — fez + tray
    const merchants = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#d0a050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="bz-merchant${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="3" y="-12" width="8" height="4" rx="1" fill="#5a4030"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bz-wrap">
        <div class="bz-head"><b>BAZAAR</b><span>摊位=配额窗 篷纹=用量 灯笼=过热 商贩=会话${hotN ? " · " + hotN + " 闹" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${roof}${stalls}${merchants}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="bz-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="bz-ksub" text-anchor="end">廊道=巷口</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "大巴扎", eyebrow: "BAZAAR", render };
})();
