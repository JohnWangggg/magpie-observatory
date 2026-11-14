/* ------------------------------------------------------------------- waypoint
 * Waypoint — a trail marker on a ridge: every quota window
 * is a cairn at a fork (stone height + blaze = used%, ≥85%
 * the summit flag burns amber); sessions are hikers (a pack
 * + staff) passing the marker.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "waypoint";
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

    // ridge line
    const ridge = `<path d="M0 ${floorY - 20} Q ${W / 4} ${floorY - 40} ${W / 2} ${floorY - 20} T ${W} ${floorY - 20} L ${W} ${floorY} L 0 ${floorY} Z" fill="#1a1e18"/>`;

    const cairns = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a09070";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const cairnY = floorY - 14;
      // stones = f
      const stones = Array.from({ length: Math.round(2 + f * 4) }, (_, si) => {
        const sw = 10 - si * 1.5;
        const sh = 4;
        const sy = cairnY - si * 4;
        return `<ellipse cx="${x}" cy="${sy}" rx="${sw}" ry="${sh / 2}" fill="#6a6050" stroke="${si === Math.round(1 + f * 4) ? (hot ? "var(--amber)" : col) : "none"}" stroke-width="${si === Math.round(1 + f * 4) ? 1 : 0}"/>`;
      }).join("");
      // blaze = f
      const blaze = `<rect x="${x - 2}" y="${cairnY - 6 - f * 4}" width="4" height="6" fill="${col}" opacity="${(0.4 + f * 0.5).toFixed(2)}"/>`;
      // flag when hot
      const flag = hot ? `<path d="M${x + 6} ${cairnY - 14} L${x + 14} ${cairnY - 12} L${x + 6} ${cairnY - 10} Z" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></path>` : "";
      return `<g class="wy-cairn${hot ? " hot" : ""}">
        ${stones}${blaze}${flag}
        <text x="${x}" y="${cairnY - 24}" class="wy-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${cairnY + 12}" class="wy-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // hikers — pack + staff
    const hikers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#908060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="wy-hiker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-5" y="-8" width="4" height="6" fill="#5a4a38"/>
        <line x1="4" y1="-4" x2="8" y2="-14" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wy-wrap">
        <div class="wy-head"><b>WAYPOINT</b><span>石堆=配额窗 路标=用量 顶旗=过热 行客=会话${hotN ? " · " + hotN + " 界" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#121410" rx="10"/>
          ${ridge}${cairns}${hikers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1a1c14"/>
          <text x="16" y="${H - 18}" class="wy-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="wy-ksub" text-anchor="end">脊=山脊线</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "航点", eyebrow: "WAYPOINT", render };
})();
