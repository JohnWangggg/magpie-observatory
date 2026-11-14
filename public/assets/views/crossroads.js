/* ------------------------------------------------------------------ crossroads
 * Crossroads — a four-way stop in the country: every quota
 * window is a signpost arm (arm glow + milestone = used%,
 * ≥85% the lantern at the corner burns amber); sessions are
 * wagoneers (a whip + reins) choosing the turn.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crossroads";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = W / 2, CY = H / 2 + 8;
    const R = Math.min(CX, CY) - 30;
    const N = quotas.length;

    // roads
    const roads = `<line x1="${CX}" y1="${CY - R - 20}" x2="${CX}" y2="${CY + R + 20}" stroke="#3a3830" stroke-width="8"/>
      <line x1="${CX - R - 20}" y1="${CY}" x2="${CX + R + 20}" y2="${CY}" stroke="#3a3830" stroke-width="8"/>
      <line x1="${CX}" y1="${CY - R - 20}" x2="${CX}" y2="${CY + R + 20}" stroke="#f0f0d0" stroke-width="1" stroke-dasharray="6 6" opacity=".5"/>
      <line x1="${CX - R - 20}" y1="${CY}" x2="${CX + R + 20}" y2="${CY}" stroke="#f0f0d0" stroke-width="1" stroke-dasharray="6 6" opacity=".5"/>`;

    // signpost at center
    const post = `<rect x="${CX - 3}" y="${CY - 20}" width="6" height="40" fill="#4a3a28"/>`;

    const arms = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
      const armLen = 20 + f * 24;
      const ax = CX + Math.cos(ang) * armLen;
      const ay = CY + Math.sin(ang) * armLen;
      // milestone at arm end
      const mile = `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${3 + f * 2}" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="${3 + f * 2};${5 + f * 2};${3 + f * 2}" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="xq-arm${hot ? " hot" : ""}">
        <line x1="${CX}" y1="${CY}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="${col}" stroke-width="2" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>
        ${mile}
        <text x="${ax.toFixed(1)}" y="${ay.toFixed(1) - 8}" class="xq-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${ax.toFixed(1)}" y="${ay.toFixed(1) + 12}" class="xq-name" text-anchor="middle">${esc(w.name.slice(0, 4))}</text>
      </g>`;
    }).join("");

    // lantern at center when any hot
    const anyHot = quotas.some(w => w.used >= 85);
    const lantern = anyHot ? `<circle cx="${CX}" cy="${CY - 24}" r="4" fill="var(--amber)">
        <animate attributeName="r" values="4;6;4" dur="1.3s" repeatCount="indefinite"/></circle>` : "";

    // wagoneers — whip + reins
    const wagoneers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const orbit = R - 20 - (i % 3) * 14;
      const startA = (i * 90) * Math.PI / 180;
      const x0 = CX + Math.cos(startA) * orbit;
      const y0 = CY + Math.sin(startA) * orbit;
      const path = `M ${x0} ${y0} A ${orbit} ${orbit} 0 1 1 ${x0 + .1} ${y0}`;
      return `<g class="xq-wagon${s.status === "err" ? " dead" : ""}">
        <circle r="4" fill="${col}" opacity=".9">
          <animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="xq-wrap">
        <div class="xq-head"><b>CROSSROADS</b><span>路牌=配额窗 臂长=用量 角灯=过热 马车=会话${hotN ? " · " + hotN + " 岔" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${roads}${post}${arms}${lantern}${wagoneers}
          <circle cx="${CX}" cy="${CY}" r="18" fill="#241c14" stroke="#4a3a28"/>
          <text x="${CX}" y="${CY + 3}" class="xq-k" text-anchor="middle">${fmt(k.tokens)}</text>
          <text x="16" y="${H - 18}" class="xq-ksub">十字=四岔</text>
          <text x="${W - 16}" y="${H - 18}" class="xq-ksub" text-anchor="end">${N} 岔</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "十字路口", eyebrow: "CROSSROADS", render };
})();
