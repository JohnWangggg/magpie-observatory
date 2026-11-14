/* --------------------------------------------------------------- kaleidoscope
 * Kaleidoscope — a mirrored chamber: every quota window is a
 * wedge in the ring (petal arc + mirror shard = used%, ≥85%
 * the wedge core burns amber); sessions are colour motes
 * drifting through the tube.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kaleidoscope";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 12);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = W / 2, CY = H / 2 + 6, R_MAX = 108;
    const N = quotas.length;

    const wedges = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c070f0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
      const r = 24 + f * (R_MAX - 24);
      const x0 = CX + Math.cos(a0) * r, y0 = CY + Math.sin(a0) * r;
      const x1 = CX + Math.cos(a1) * r, y1 = CY + Math.sin(a1) * r;
      // petal wedge
      const wedge = `<path d="M${CX} ${CY} L${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${col}" opacity="${(0.18 + f * 0.4).toFixed(2)}"/>`;
      // mirror shard line
      const midA = (a0 + a1) / 2;
      const shard = `<line x1="${CX + Math.cos(midA) * 24}" y1="${CY + Math.sin(midA) * 24}" x2="${CX + Math.cos(midA) * (24 + f * (R_MAX - 24))}" y2="${CY + Math.sin(midA) * (24 + f * (R_MAX - 24))}" stroke="#f0f4f8" stroke-width="${hot ? 1.6 : 1}" opacity="${hot ? .9 : .5}"/>`;
      // core
      const core = `<circle cx="${CX + Math.cos(midA) * (24 + f * 18)}" cy="${CY + Math.sin(midA) * (24 + f * 18)}" r="${hot ? 3 : 2}" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="ke-wedge${hot ? " hot" : ""}">${wedge}${shard}${core}</g>`;
    }).join("");

    // outer mirror segments
    const mirrors = Array.from({ length: N }, (_, i) => {
      const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
      const x0 = CX + Math.cos(a0) * R_MAX, y0 = CY + Math.sin(a0) * R_MAX;
      const x1 = CX + Math.cos(a1) * R_MAX, y1 = CY + Math.sin(a1) * R_MAX;
      const xm = CX + Math.cos((a0 + a1) / 2) * (R_MAX + 6);
      const ym = CY + Math.sin((a0 + a1) / 2) * (R_MAX + 6);
      return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${xm.toFixed(1)} ${ym.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#384048" stroke-width="1" opacity=".6"/>`;
    }).join("");

    // motes — sessions as drifting sparks
    const motes = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#d0a0f0");
      const dur = Math.max(8, 18 - (s.tps || 0) / 12);
      const orbit = 50 + (i % 3) * 22;
      const speed = (2 + (i % 2) * 1.4) / dur;
      const path = `M ${CX} ${CY} m ${-orbit},0 a ${orbit},${orbit} 0 1,0 ${orbit * 2},0 a ${orbit},${orbit} 0 1,0 -${orbit * 2},0`;
      return `<g class="ke-mote${s.status === "err" ? " dead" : ""}">
        <circle r="${2.5 + (i % 3) * .8}" fill="${col}" opacity=".85">
          <animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ke-wrap">
        <div class="ke-head"><b>KALEIDOSCOPE</b><span>瓣=配额窗 镜线=用量 核=过热 彩尘=会话${hotN ? " · " + hotN + " 炽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0e0a16" rx="10"/>
          <circle cx="${CX}" cy="${CY}" r="${R_MAX + 10}" fill="none" stroke="#2a2040" stroke-width="2"/>
          ${mirrors}${wedges}
          <circle cx="${CX}" cy="${CY}" r="22" fill="#1a1428" stroke="#3a3050"/>
          <text x="${CX}" y="${CY + 3}" class="ke-k" text-anchor="middle">${fmt(k.tokens)}</text>
          ${motes}
          <text x="16" y="${H - 18}" class="ke-ksub">镜筒</text>
          <text x="${W - 16}" y="${H - 18}" class="ke-ksub" text-anchor="end">${N} 瓣</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "万花筒", eyebrow: "KALEIDO", render };
})();
