/* ------------------------------------------------------------------- castle
 * Castle — the keep at dusk: every provider window is a tower, its
 * pennant streams faster the hotter the quota is; live sessions are
 * guards walking the battlement; the drawbridge shows the day's total.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "castle";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WALL = 240, GROUND = 278;
    const n = Math.max(1, quotas.length);
    const slot = (W - 80) / n;
    const tw = Math.min(52, slot - 8);

    const towers = quotas.map((w, i) => {
      const x = 40 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const h = 80 - (w.used / 100) * 30;          // taller = fresher
      const flagLen = 16 + (w.used / 100) * 14;    // longer = hotter
      return `<g class="ct-tower${hot ? " hot" : ""}" style="--pc:${m.color || "#8b7cf6"}">
        <rect x="${(x - tw / 2).toFixed(1)}" y="${(WALL - h).toFixed(1)}" width="${tw.toFixed(1)}" height="${h + 40}" fill="var(--card-3)" stroke="var(--line-2)"/>
        ${Array.from({ length: 3 }, (_, j) => `<rect x="${(x - tw / 2 + 4 + j * (tw / 3)).toFixed(1)}" y="${(WALL - h - 8).toFixed(1)}" width="${(tw / 3 - 4).toFixed(1)}" height="10" fill="var(--card-3)" stroke="var(--line-2)"/>`).join("")}
        <rect x="${(x - tw / 2 + 6).toFixed(1)}" y="${(WALL - h + 22).toFixed(1)}" width="${(tw - 12).toFixed(1)}" height="14" rx="2" fill="${hot ? "var(--red)" : m.color || "#8b7cf6"}" opacity=".85"/>
        <line x1="${x.toFixed(1)}" y1="${WALL - h - 8}" x2="${x.toFixed(1)}" y2="${WALL - h - 34}" stroke="var(--line-2)" stroke-width="1.4"/>
        <path class="ct-flag" style="animation-duration:${(1.8 - Math.min(1.4, w.used / 60)).toFixed(2)}s"
          d="M ${x.toFixed(1)} ${WALL - h - 34} L ${(x + flagLen).toFixed(1)} ${WALL - h - 28} L ${x.toFixed(1)} ${WALL - h - 22} Z" fill="${hot ? "var(--red)" : m.color || "#8b7cf6"}"/>
        <text x="${x.toFixed(1)}" y="${(WALL - h / 2).toFixed(1)}" class="ct-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${GROUND + 16}" class="ct-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // guards — sessions pacing the wall
    const guards = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = 6 + (i % 3) * 2;
      const gy = WALL - 10 - (i % 2) * 8;
      return `<g class="ct-guard${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 1.1).toFixed(1)}s">
        <circle cx="0" cy="${gy - 8}" r="3.4" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}"/>
        <line x1="0" y1="${gy - 4}" x2="0" y2="${gy + 6}" stroke="${dead ? "var(--red)" : m.color || "#fbbf24"}" stroke-width="2.2" stroke-linecap="round"/>
        <animateTransform attributeName="transform" type="translate" values="30 0;${W - 30} 0" dur="${dur}s" begin="${(-i * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    // wall + gate + drawbridge
    const gateX = W / 2;
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ct-wrap">
        <div class="ct-head"><b>CASTLE</b><span>塔=配额窗 旗=热度 卫=会话${hotN ? " · " + hotN + " 塔告急" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <rect x="0" y="${WALL}" width="${W}" height="${GROUND - WALL}" fill="var(--card-2)" stroke="var(--line-2)"/>
          ${Array.from({ length: 9 }, (_, i) => `<rect x="${20 + i * 42}" y="${WALL - 8}" width="20" height="8" fill="var(--card-2)" stroke="var(--line-2)"/>`).join("")}
          <rect x="${gateX - 16}" y="${GROUND - 36}" width="32" height="36" rx="2" fill="var(--card-3)" stroke="var(--line-2)"/>
          <path d="M ${gateX - 16} ${GROUND} L ${gateX - 24} ${GROUND + 14} M ${gateX + 16} ${GROUND} L ${gateX + 24} ${GROUND + 14}" stroke="var(--line-2)" stroke-width="2" fill="none"/>
          <line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="var(--line-2)" stroke-width="1.8"/>
          ${towers}${guards}
          <g class="ct-card">
            <rect x="${W - 140}" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="30" class="ct-k">${fmt(k.tokens)} · ${sessions.length} 卫</text>
            <text x="${W - 130}" y="43" class="ct-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "城堡", eyebrow: "CASTLE", render };
})();
