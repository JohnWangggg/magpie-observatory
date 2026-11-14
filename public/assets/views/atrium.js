/* -------------------------------------------------------------------- atrium
 * Atrium — a hotel lobby with balconies around a skylight:
 * every quota window is a balcony planter (vine length/glow =
 * used%, ≥85% the planter lamp burns amber); sessions are
 * guests (head + shoulders) strolling the balcony rail.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "atrium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 42, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    // skylight
    const sky = `<ellipse cx="${W / 2}" cy="${TOP - 18}" rx="${W / 2 - 30}" ry="10" fill="#f0e8c0" opacity=".35"/>`;

    const balconies = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#70a070";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const railY = TOP + bh * .3;
      const planterW = bw - 20, planterH = 10;
      const planterY = railY + 8;
      // vine drops from planter; length = f
      const vineLen = 8 + f * 34;
      const leafR = 2 + f * 4;
      const leaves = Array.from({ length: 4 }, (_, li) => {
        const ly = planterY + planterH + 4 + li * (vineLen / 4);
        const lx = x - planterW / 4 + (li % 2) * (planterW / 2);
        return `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${leafR.toFixed(1)}" ry="${(leafR * .55).toFixed(1)}" fill="${col}" opacity="${(0.4 + f * .5).toFixed(2)}" transform="rotate(${(li % 2 ? 30 : -30)} ${lx} ${ly})"/>`;
      }).join("");
      return `<g class="ah-balcony${hot ? " hot" : ""}">
        <!-- rail -->
        <line x1="${x - bw / 2 + 6}" y1="${railY}" x2="${x + bw / 2 - 6}" y2="${railY}" stroke="#384048" stroke-width="1.5"/>
        <line x1="${x - bw / 2 + 6}" y1="${railY + 5}" x2="${x + bw / 2 - 6}" y2="${railY + 5}" stroke="#2a3038" stroke-width="1"/>
        <!-- balusters -->
        ${[0, 1, 2, 3].map(b => `<line x1="${x - bw / 2 + 14 + b * (bw - 32) / 3}" y1="${railY}" x2="${x - bw / 2 + 14 + b * (bw - 32) / 3}" y2="${railY + 5}" stroke="#2a3038" stroke-width="1"/>`).join("")}
        <!-- planter -->
        <rect x="${x - planterW / 2}" y="${planterY}" width="${planterW}" height="${planterH}" rx="2" fill="#3a3028" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${leaves}
        <text x="${x}" y="${planterY + planterH + vineLen + 10}" class="ah-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${planterY + planterH + vineLen + 19}" class="ah-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + planterW / 2 - 4}" cy="${planterY + 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // guests — head + shoulders on the rail line
    const guests = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0b0a0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = TOP + bh * .3 - 6 - (i % 2) * 3;
      return `<g class="ah-guest${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-14} ${y.toFixed(1)};${W + 14} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3" fill="${col}"/>
        <ellipse cx="0" cy="-1" rx="4.5" ry="5" fill="${col}" opacity=".85"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ah-wrap">
        <div class="ah-head"><b>ATRIUM</b><span>花台=配额窗 垂蔓=用量 廊客=会话${hotN ? " · " + hotN + " 满台" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14181e" rx="10"/>
          ${sky}${balconies}${guests}
          <text x="16" y="${H - 18}" class="ah-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ah-ksub" text-anchor="end">天窗=顶光</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "中庭", eyebrow: "ATRIUM", render };
})();
