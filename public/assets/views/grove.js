/* -------------------------------------------------------------------- grove
 * Grove — a small orchard: each quota window is a fruit tree — the
 * fuller its window, the more fruit hangs (≥85% the fruit ripens red
 * and drops); sessions are pickers carrying baskets between the rows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "grove";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(65003);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 234;
    const n = Math.max(1, quotas.length);
    const gap = (W - 56) / n;

    const trees = quotas.map((w, i) => {
      const cx = 34 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const th = 66;                                    // canopy center height
      const cy = GY - th;
      const nf = Math.round(f * 12);                    // fruit count
      const fruitCol = hot ? "var(--red)" : f > .55 ? "var(--amber)" : m.color || "#7fb069";
      let fruit = "";
      for (let p = 0; p < nf; p++) {
        const a = rnd() * Math.PI * 2, rr = 6 + rnd() * 18;
        fruit += `<circle cx="${(cx + Math.cos(a) * rr * 1.3).toFixed(1)}" cy="${(cy + Math.sin(a) * rr * .62).toFixed(1)}" r="${(2.4 + rnd() * 1.6).toFixed(1)}" fill="${fruitCol}"/>`;
      }
      // ripe fruit dropping when hot
      let drop = "";
      if (hot) {
        drop = `<circle cx="${cx - 6}" r="3" fill="var(--red)">
          <animate attributeName="cy" values="${cy};${GY - 4}" dur="1.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;.2" dur="1.6s" repeatCount="indefinite"/></circle>`;
      }
      return `<g class="gv-tree${hot ? " hot" : ""}">
        <path d="M ${cx.toFixed(1)} ${GY} q -2 -20 0 -38" stroke="#7a5c3e" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="${cx.toFixed(1)}" cy="${cy}" rx="30" ry="18" fill="color-mix(in srgb, #4d7a4d ${hot ? 30 : 55}%, var(--card-2))"/>
        ${fruit}${drop}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="gv-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="gv-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pickers — sessions carrying baskets along the row
    const pickers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = GY - 8;
      const dur = Math.max(7, 17 - (s.tps || 0) / 8);
      return `<g class="gv-picker${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${20 + i * 60} ${y};${W - 60 - i * 30} ${y}" dur="${dur}s" begin="${(-i * 2).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-14" r="4" fill="${dead ? "var(--red)" : m.color || "#c9a06b"}"/>
        <path d="M -4 -10 h 8 l 2 10 h -12 Z" fill="${dead ? "var(--red)" : "#8a6a48"}"/>
        <path d="M 6 -6 q 6 0 6 5 q 0 3 -6 3 q -6 0 -6 -3 q 0 -5 6 -5 Z" fill="none" stroke="#d9b98a" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gv-wrap">
        <div class="gv-head"><b>GROVE</b><span>树=配额窗 果=用量 人=会话${hotN ? " · " + hotN + " 树果落" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2416 28%, transparent)" rx="10"/>
          <rect x="16" y="${GY}" width="${W - 32}" height="3" rx="1.5" fill="#5a4a36" opacity=".8"/>
          ${trees}${pickers}
          <g class="gv-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="gv-k">${fmt(k.tokens)} · ${sessions.length} 人</text>
            <text x="22" y="43" class="gv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "果园", eyebrow: "GROVE", render };
})();
