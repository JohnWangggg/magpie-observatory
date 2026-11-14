/* ------------------------------------------------------------------ theater
 * Theater — a stage with a velvet curtain and footlights: each
 * quota window is a spotlight cone from the truss (cone opacity
 * = used%; ≥85% burns amber); sessions are performers (a head
 * + dress silhouette) bowing under the cones.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "theater";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 42, BOT = 44;
    const floorY = H - BOT - 20;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 40) / cols;

    // truss at top
    const truss = `<rect x="20" y="${TOP - 16}" width="${W - 40}" height="8" rx="2" fill="#1a1f26"/>`;

    const cones = quotas.map((w, i) => {
      const x = 20 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#f0d0a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const spotY = TOP - 4;
      const spread = 18 + f * 26;
      const coneO = (0.15 + f * 0.65).toFixed(2);
      return `<g class="tj-cone${hot ? " hot" : ""}">
        <circle cx="${x}" cy="${spotY + 4}" r="4" fill="#384048"/>
        <path d="M${x - 4} ${spotY + 4} L${x - spread / 2} ${floorY} L${x + spread / 2} ${floorY} L${x + 4} ${spotY + 4} Z"
          fill="${col}" opacity="${coneO}">
          ${hot ? `<animate attributeName="opacity" values="${coneO};.3;${coneO}" dur="1.6s" repeatCount="indefinite"/>` : ""}
        </path>
        <ellipse cx="${x}" cy="${floorY}" rx="${spread / 2}" ry="5" fill="${col}" opacity="${(f * .6).toFixed(2)}"/>
        ${hot ? `<circle cx="${x}" cy="${spotY + 4}" r="6" fill="var(--amber)" opacity=".5">
          <animate attributeName="r" values="6;8;6" dur="1.3s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${floorY + 16}" class="tj-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${floorY + 26}" class="tj-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // performers
    const performers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0a0a0");
      const dur = Math.max(10, 20 - (s.tps || 0) / 10);
      return `<g class="tj-perf${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${floorY - 8};${W + 16} ${floorY - 8}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-16" r="3.5" fill="${col}"/>
        <path d="M-4 -12 L4 -12 L6 -2 L-6 -2 Z" fill="${col}" opacity=".9"/>
      </g>`;
    }).join("");

    // curtain edges
    const curtains = `
      <rect x="0" y="0" width="16" height="${H - BOT}" fill="#5a0f1a"/>
      <rect x="${W - 16}" y="0" width="16" height="${H - BOT}" fill="#5a0f1a"/>
      <rect x="0" y="0" width="${W}" height="${TOP - 20}" fill="#5a0f1a"/>`;

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tj-wrap">
        <div class="tj-head"><b>THEATER</b><span>聚光=配额窗 锥度=用量 演员=会话${hotN ? " · " + hotN + " 强灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#140a0d" rx="10"/>
          ${curtains}${truss}${cones}${performers}
          <rect x="0" y="${floorY + 8}" width="${W}" height="${BOT + 14}" fill="#241418"/>
          <text x="16" y="${H - 18}" class="tj-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="tj-ksub" text-anchor="end">红幕=边界</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "剧场", eyebrow: "THEATER", render };
})();
