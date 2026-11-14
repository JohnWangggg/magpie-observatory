/* --------------------------------------------------------------- glassworks
 * Glassworks — a row of glory holes: every quota window is a
 * glassblowing furnace (interior glow + bubble wobble = used%,
 * ≥85% the glory hole burns amber); sessions are glassblowers
 * (a cap + blowpipe) shaping the gather.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glassworks";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const furnaces = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60c0e0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const furnY = floorY - 12;
      const furnW = bw - 18, furnH = 38;
      const mouthW = furnW * .55, mouthH = 14;
      const glowR = 4 + f * 6;
      return `<g class="gm-furn${hot ? " hot" : ""}">
        <!-- furnace -->
        <path d="M${x - furnW / 2} ${furnY} L${x - furnW / 2} ${furnY - furnH} A ${furnW / 2} 6 0 0 1 ${x + furnW / 2} ${furnY - furnH} L${x + furnW / 2} ${furnY} Z"
          fill="#3a2a20" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : .8}"/>
        <!-- glory hole -->
        <ellipse cx="${x}" cy="${furnY - furnH * .4}" rx="${mouthW / 2}" ry="${mouthH / 2}" fill="#180e08"/>
        <ellipse cx="${x}" cy="${furnY - furnH * .4}" rx="${(mouthW / 2 - 4).toFixed(1)}" ry="${(mouthH / 2 - 3).toFixed(1)}" fill="${col}" opacity="${(0.3 + f * 0.6).toFixed(2)}">
          ${hot ? `<animate attributeName="opacity" values="${(0.3 + f * 0.6).toFixed(2)};.4;${(0.3 + f * 0.6).toFixed(2)}" dur="1.2s" repeatCount="indefinite"/>` : ""}
        </ellipse>
        <!-- molten gather bubble -->
        <circle cx="${x}" cy="${furnY - furnH * .4}" r="${glowR.toFixed(1)}" fill="${col}" opacity=".8">
          <animate attributeName="r" values="${glowR.toFixed(1)};${(glowR + 2).toFixed(1)};${glowR.toFixed(1)}" dur="${(1.2 + f).toFixed(1)}s" repeatCount="indefinite"/></circle>
        <!-- chimney -->
        <rect x="${x - 4}" y="${furnY - furnH - 10}" width="8" height="10" fill="#4a3428"/>
        ${hot ? `<circle cx="${x + furnW / 2 - 4}" cy="${furnY - furnH - 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${furnY + 12}" class="gm-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${furnY + 21}" class="gm-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // glassblowers — cap + blowpipe with gather
    const blowers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a0d0e0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="gm-blower${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="14" y2="-7" stroke="${col}" stroke-width="1.5"/>
        <circle cx="15" cy="-7" r="3" fill="#f0a0c0" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gm-wrap">
        <div class="gm-head"><b>GLASSWORKS</b><span>窑口=配额窗 泡团=用量 吹工=会话${hotN ? " · " + hotN + " 炽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141018" rx="10"/>
          ${furnaces}${blowers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a20"/>
          <text x="16" y="${H - 18}" class="gm-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gm-ksub" text-anchor="end">吹管=长杆</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "玻璃厂", eyebrow: "GLASSWORKS", render };
})();
