/* ------------------------------------------------------------------ market
 * Market — the bazaar row: every quota window is a stall under a
 * striped awning — the goods piled on the counter shrink as the
 * window sells out (empty counter flashes the sold-out tag);
 * sessions are shoppers weaving through the aisle.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "market";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, AISLE = 226;

    // stalls
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const stalls = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const empty = w.used >= 85;
      const room = 1 - w.used / 100;
      const c = empty ? "var(--red)" : m.color || "#fbbf24";
      // awning stripes
      const stripes = [-1, 0, 1].map(s =>
        `<rect x="${(x + s * 11 - 5).toFixed(1)}" y="${AISLE - 62}" width="10" height="9" fill="${s % 2 ? c : "var(--card-3)"}" opacity="${s % 2 ? .9 : 1}"/>`
      ).join("");
      // goods pile height = room
      const pile = 4 + room * 16;
      return `<g class="mk-stall${empty ? " empty" : ""}">
        <line x1="${(x - 22).toFixed(1)}" y1="${AISLE - 26}" x2="${(x - 22).toFixed(1)}" y2="${AISLE - 60}" stroke="var(--line-2)" stroke-width="1.6"/>
        <line x1="${(x + 22).toFixed(1)}" y1="${AISLE - 26}" x2="${(x + 22).toFixed(1)}" y2="${AISLE - 60}" stroke="var(--line-2)" stroke-width="1.6"/>
        ${stripes}
        <rect x="${(x - 24).toFixed(1)}" y="${AISLE - 26}" width="48" height="22" rx="2" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.2"/>
        <ellipse cx="${x.toFixed(1)}" cy="${(AISLE - 28 - pile / 2).toFixed(1)}" rx="12" ry="${(pile / 2).toFixed(1)}" fill="${c}" opacity="${empty ? .35 : .8}"/>
        ${empty ? `<text x="${x.toFixed(1)}" y="${AISLE - 34}" class="mk-sold" text-anchor="middle">售罄</text>` : ""}
        <text x="${x.toFixed(1)}" y="${AISLE + 12}" class="mk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${AISLE + 23}" class="mk-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // shoppers — sessions weaving the aisle
    const shoppers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = AISLE - 6 + (i % 2) * 14;
      const dur = Math.max(4, 11 - (s.tps || 0) / 18);
      const dir = i % 2 ? -1 : 1;
      return `<g class="mk-shop${dead ? " dead" : ""}">
        <circle cx="0" cy="-9" r="3" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}"/>
        <rect x="-3.4" y="-6" width="6.8" height="9" rx="2" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}" opacity=".9"/>
        <rect x="4" y="-4" width="5" height="6" rx="1" fill="var(--card-3)" stroke="var(--line-2)" stroke-width=".8"/>
        <animateTransform attributeName="transform" type="translate"
          values="${dir > 0 ? -20 : W + 20} ${y};${dir > 0 ? W + 20 : -20} ${y}"
          dur="${dur}s" begin="${(-i * 1.3).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const emptyN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mk-wrap">
        <div class="mk-head"><b>MARKET</b><span>摊=配额窗 客=会话 货=余量${emptyN ? " · " + emptyN + " 摊售罄" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${AISLE + 40}" x2="${W - 30}" y2="${AISLE + 40}" stroke="var(--line-2)" stroke-width="4"/>
          ${stalls}${shoppers}
          <g class="mk-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="mk-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="43" class="mk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "市集", eyebrow: "MARKET", render };
})();
