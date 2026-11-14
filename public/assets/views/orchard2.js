/* ------------------------------------------------------------------ orchard2
 * Orchard II — a cider orchard in blossom: every quota
 * window is a standard tree (fruit load + bee = used%,
 * ≥85% the picking ladder burns amber); sessions are
 * pickers (a flat cap + basket) gathering the crop.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "orchard2";
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

    const trees = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c06060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const treeY = floorY - 16;
      const trunkH = 16 + f * 8;
      const canopyR = 10 + f * 6;
      // fruit = f
      const fruits = Array.from({ length: Math.round(f * 6) }, (_, fi) => {
        const fa = (fi * 60) * Math.PI / 180;
        const fx = x + Math.cos(fa) * (canopyR - 3);
        const fy = treeY - trunkH + Math.sin(fa) * (canopyR - 3);
        return `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="1.5" fill="${col}"/>`;
      }).join("");
      // bee
      const bee = hot ? `<circle cx="${x + canopyR + 6}" cy="${treeY - trunkH - 4}" r="1.5" fill="var(--amber)">
          <animate attributeName="cx" values="${x + canopyR + 6};${x + canopyR + 14};${x + canopyR + 6}" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // ladder when hot
      const ladder = hot ? `<line x1="${x - 8}" y1="${treeY}" x2="${x - 4}" y2="${treeY - trunkH - canopyR + 4}" stroke="var(--amber)" stroke-width="1.5">
          <line x1="${x - 7}" y1="${treeY - 4}" x2="${x - 3}" y2="${treeY - 4}" stroke="var(--amber)" stroke-width="1"/>
          <line x1="${x - 6}" y1="${treeY - 8}" x2="${x - 2}" y2="${treeY - 8}" stroke="var(--amber)" stroke-width="1"/></line>` : "";
      return `<g class="od-tree${hot ? " hot" : ""}">
        <!-- trunk -->
        <line x1="${x}" y1="${treeY}" x2="${x}" y2="${treeY - trunkH}" stroke="#4a3a28" stroke-width="2.5"/>
        <!-- canopy -->
        <ellipse cx="${x}" cy="${treeY - trunkH}" rx="${canopyR}" ry="${canopyR * .8}" fill="#3a4a30" stroke="${hot ? "var(--amber)" : "#4a5a40"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${fruits}${bee}${ladder}
        <text x="${x}" y="${treeY - trunkH - canopyR - 8}" class="od-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${treeY + 12}" class="od-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // pickers — flat cap + basket
    const pickers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a07050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="od-picker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-2" y="-12" width="7" height="2" fill="#3a3020"/>
        <ellipse cx="8" cy="-2" rx="4" ry="3" fill="#8a7050"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="od-wrap">
        <div class="od-head"><b>ORCHARD II</b><span>树=配额窗 果=用量 蜂=过热 摘手=会话${hotN ? " · " + hotN + " 熟" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141410" rx="10"/>
          ${trees}${pickers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="od-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="od-ksub" text-anchor="end">行距=株距</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "果园二号", eyebrow: "ORCHARD II", render };
})();
