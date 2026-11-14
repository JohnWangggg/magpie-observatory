/* ------------------------------------------------------------------- depot
 * Depot — the sorting floor: every quota window is a shelf bay —
 * empty slots fill up as the window burns down (overloaded bays
 * flash the overflow lamp); sessions are parcels riding the
 * conveyor underneath.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "depot";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SHELF = 118, BELT = 226;

    // shelf bays — grid of slots that fill as used % climbs
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const shelves = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = w.used / 100;
      // 3x2 slot grid, bottom-up fill order
      const slots = [0,1,2,3,4,5].map(j => {
        const col = j % 3, row = Math.floor(j / 3);
        const sx = x - 15 + col * 11;
        const sy = SHELF - 12 - row * 14;
        const on = (j + 1) / 6 <= fill || fill >= 0.99 && j < 6;
        return `<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="9" height="11" rx="1.5"
          fill="${on ? (hot ? "var(--red)" : m.color || "#d9a03f") : "var(--card-3)"}"
          stroke="var(--line-2)" stroke-width=".8" opacity="${on ? .95 : .5}"/>`;
      }).join("");
      return `<g class="dp-bay${hot ? " hot" : ""}">
        <rect x="${(x - 20).toFixed(1)}" y="${SHELF - 40}" width="40" height="42" rx="3" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
        <line x1="${(x - 20).toFixed(1)}" y1="${SHELF - 12}" x2="${(x + 20).toFixed(1)}" y2="${SHELF - 12}" stroke="var(--line-2)" stroke-width="1"/>
        ${slots}
        <circle class="dp-lamp" cx="${(x + 16).toFixed(1)}" cy="${SHELF - 46}" r="2.6" fill="${hot ? "var(--red)" : "var(--card-3)"}" stroke="var(--line-2)" stroke-width=".8"/>
        <text x="${x.toFixed(1)}" y="${SHELF + 14}" class="dp-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${SHELF + 25}" class="dp-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // conveyor belt + parcels
    const belt = `<g>
      <line x1="30" y1="${BELT}" x2="${W - 30}" y2="${BELT}" stroke="var(--line-2)" stroke-width="8" opacity=".7"/>
      <line x1="30" y1="${BELT}" x2="${W - 30}" y2="${BELT}" stroke="var(--card-3)" stroke-width="5"/>
      ${[0,1,2,3,4,5,6,7].map(i => `<line class="dp-roll" x1="${50 + i * 46}" y1="${BELT - 4}" x2="${50 + i * 46}" y2="${BELT + 4}" stroke="var(--line-2)" stroke-width="1.4" opacity=".7" style="animation-delay:${(i * .3).toFixed(1)}s"/>`).join("")}
    </g>`;

    const parcels = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const sz = 9 + Math.min(6, (s.tokens || 0) / 1.2e6);
      const dur = Math.max(4, 12 - (s.tps || 0) / 18);
      return `<g class="dp-box${dead ? " dead" : ""}">
        <rect x="${(-sz / 2).toFixed(1)}" y="${(-sz).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" rx="1.8"
          fill="${dead ? "var(--red)" : m.color || "#d9a03f"}" stroke="var(--line-2)" stroke-width=".8"/>
        <line x1="0" y1="${(-sz).toFixed(1)}" x2="0" y2="0" stroke="var(--card-1)" stroke-width="1" opacity=".6"/>
        <animateTransform attributeName="transform" type="translate" values="30 ${BELT};${W - 30} ${BELT}"
          dur="${dur}s" begin="${(-i * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dp-wrap">
        <div class="dp-head"><b>DEPOT</b><span>架=配额窗 件=会话 位=余量${hotN ? " · " + hotN + " 架爆灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          ${shelves}${belt}${parcels}
          <g class="dp-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="dp-k">${fmt(k.tokens)} · ${sessions.length} 件</text>
            <text x="22" y="43" class="dp-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "分拣站", eyebrow: "DEPOT", render };
})();
