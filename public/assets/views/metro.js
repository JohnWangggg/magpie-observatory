/* ------------------------------------------------------------------- metro
 * Metro — a transit map at rush hour: each quota window is a line whose
 * band thickens with congestion as used % climbs (≥85% the line runs
 * red, late); sessions are trains shuttling between the terminals.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "metro";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, X0 = 44, X1 = 356;
    const n = Math.max(1, quotas.length);
    const lanes = Math.min(4, n);                      // lines share lanes

    const lines = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = hot ? "var(--red)" : m.color || "#5fa8d9";
      const y = 60 + (i % lanes) * 46;
      const bw = 2.5 + f * 5.5;                        // band width = congestion
      // stations: ticks along the line
      let stops = "";
      for (let s2 = 0; s2 < 6; s2++) {
        const sx = X0 + 30 + s2 * ((X1 - X0 - 60) / 5);
        stops += `<circle cx="${sx.toFixed(1)}" cy="${y}" r="3" fill="var(--card-2)" stroke="${col}" stroke-width="1.4"/>`;
      }
      // late marker when hot
      const late = hot ? `<text x="${X1 - 4}" y="${y - 8}" class="mt-late" text-anchor="end">晚点</text>` : "";
      return `<g class="mt-line${hot ? " hot" : ""}">
        <line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}" stroke="${col}" stroke-width="${bw.toFixed(1)}" stroke-linecap="round" opacity="${hot ? ".85" : ".65"}"/>
        ${stops}${late}
        <text x="${X0 - 8}" y="${y + 4}" class="mt-name" text-anchor="end">${esc((m.name || w.prov).slice(0, 6))}</text>
        <text x="${X0 - 8}" y="${y + 14}" class="mt-pct" text-anchor="end">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // trains — sessions riding a lane back and forth
    const trains = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = 60 + (i % lanes) * 46;
      const dur = Math.max(4, 14 - (s.tps || 0) / 10);
      return `<g class="mt-train${dead ? " dead" : ""}">
        <rect x="-9" y="-4.5" width="18" height="9" rx="3" fill="${dead ? "var(--red)" : m.color || "#e8e0c8"}" opacity=".95">
          <animateTransform attributeName="transform" type="translate" values="${X0} ${y};${X1} ${y};${X0} ${y}" dur="${dur * 2}s" begin="${(-i * 1.6).toFixed(1)}s" repeatCount="indefinite"/>
        </rect>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mt-wrap">
        <div class="mt-head"><b>METRO</b><span>线=配额窗 宽=拥挤 车=会话${hotN ? " · " + hotN + " 线晚点" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14181f 30%, transparent)" rx="10"/>
          ${lines}${trains}
          <g class="mt-card">
            <rect x="14" y="248" width="128" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="266" class="mt-k">${fmt(k.tokens)} · ${sessions.length} 车</text>
            <text x="22" y="279" class="mt-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "地下铁", eyebrow: "METRO", render };
})();
