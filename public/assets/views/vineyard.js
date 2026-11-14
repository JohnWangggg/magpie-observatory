/* ----------------------------------------------------------------- vineyard
 * Vineyard — terraced rows of grapevines under a late sun:
 * every quota window is a vine row (grape cluster size/glow
 * = used%, ≥85% the cluster burns amber); sessions are
 * harvesters carrying baskets between the rows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vineyard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22071105);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 40, BOT = 40;
    const rows = quotas.length;
    const rh = (H - TOP - BOT) / rows;

    const vines = quotas.map((w, i) => {
      const y = TOP + i * rh + rh / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#8a60a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      // vine trunk + posts + grape clusters
      const posts = [30, 110, 190, 270, 350].map(px => `
        <line x1="${px}" y1="${y - 6}" x2="${px}" y2="${y + 10}" stroke="#4a3828" stroke-width="1.5"/>
        <line x1="${px - 12}" y1="${y - 6}" x2="${px + 12}" y2="${y - 6}" stroke="#4a3828" stroke-width="1"/>`).join("");
      // grape cluster — sized by f
      const r = 4 + f * 7;
      const grapes = Array.from({ length: 5 }, (_, gi) => {
        const gx = 60 + gi * 68 + (rnd() * 8 - 4);
        const gy = y + 2 + (rnd() * 6 - 3);
        return `<g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)})">
          <circle cx="0" cy="0" r="${(r * .4).toFixed(1)}" fill="${col}" opacity="${(0.3 + f * .7).toFixed(2)}"/>
          <circle cx="${(r * .35).toFixed(1)}" cy="${(r * .3).toFixed(1)}" r="${(r * .3).toFixed(1)}" fill="${col}" opacity="${(0.25 + f * .6).toFixed(2)}"/>
          <circle cx="${(-r * .35).toFixed(1)}" cy="${(r * .35).toFixed(1)}" r="${(r * .3).toFixed(1)}" fill="${col}" opacity="${(0.25 + f * .6).toFixed(2)}"/>
          <circle cx="0" cy="${(r * .55).toFixed(1)}" r="${(r * .3).toFixed(1)}" fill="${col}" opacity="${(0.25 + f * .6).toFixed(2)}"/>
        </g>`;
      }).join("");
      return `<g class="vy-vine${hot ? " hot" : ""}">
        <line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#2a2018" stroke-width="2.5"/>
        ${posts}${grapes}
        <text x="${W - 8}" y="${y - 8}" class="vy-num" text-anchor="end">${Math.round(w.used)}%</text>
        <text x="8" y="${y - 8}" class="vy-name">${esc(w.name.slice(0, 6))}</text>
        ${hot ? `<circle cx="${W - 40}" cy="${y - 6}" r="4" fill="var(--amber)">
          <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // harvesters
    const harvesters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a060");
      const dur = Math.max(11, 22 - (s.tps || 0) / 10);
      const y = TOP + (i * rh + rh / 2) % (H - TOP - BOT);
      return `<g class="vy-worker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${(y - 2).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="7" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L9 -8 L10 -5 L5 -1 Z" fill="#5a4028"/>
        <path d="M-4 -4 L-9 -8 L-10 -5 L-5 -1 Z" fill="#5a4028"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vy-wrap">
        <div class="vy-head"><b>VINEYARD</b><span>藤架=配额窗 果串=用量 采摘工=会话${hotN ? " · " + hotN + " 满架" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#1a160f" rx="10"/>
          <circle cx="${W - 40}" cy="34" r="16" fill="#f0d0a0" opacity=".3"/>
          ${vines}${harvesters}
          <text x="16" y="${H - 18}" class="vy-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="vy-ksub" text-anchor="end">木杆=架柱</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "葡萄园", eyebrow: "VINEYARD", render };
})();
