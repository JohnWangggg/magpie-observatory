/* --------------------------------------------------------------------- river
 * River — a meandering stream: every quota window is a bend whose bulge
 * widens as used % climbs (≥85% the water foams red at the bank);
 * sessions are fish swimming downstream.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "river";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77120341);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const n = Math.max(1, quotas.length);
    const laneH = (H - 60) / n;

    // one meander per quota window — channel widens as used % climbs
    const bends = quotas.map((w, i) => {
      const y = 34 + laneH * i + laneH / 2;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bulge = 10 + f * 30;                                   // meander amplitude
      const col = m.color || "#5d95b8";
      // flowing current dashes
      const cur = `<line x1="20" y1="${y.toFixed(1)}" x2="${W - 20}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="1" stroke-opacity=".3" stroke-dasharray="14 10">
        <animate attributeName="stroke-dashoffset" values="24;0" dur="1.6s" repeatCount="indefinite"/></line>`;
      // foam when over quota
      const foam = hot ? Array.from({ length: 3 }, (_, k) =>
        `<circle cx="${(60 + k * 110).toFixed(1)}" cy="${(y - bulge * .5).toFixed(1)}" r="${(1.6 + f * 1.4).toFixed(1)}" fill="var(--red)" opacity=".8">
          <animate attributeName="cx" values="${(60 + k * 110).toFixed(1)};${(30 + k * 110).toFixed(1)}" dur="${(1.8 + k * .4).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".8;0" dur="${(1.8 + k * .4).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("") : "";
      const meander = `<path d="M 14 ${y.toFixed(1)} Q ${(W / 4).toFixed(0)} ${(y - bulge).toFixed(1)} ${(W / 2).toFixed(0)} ${y.toFixed(1)} T ${(W - 14).toFixed(0)} ${y.toFixed(1)}"
        fill="none" stroke="${hot ? "var(--red)" : col}" stroke-width="${(4 + f * 8).toFixed(1)}" stroke-opacity="${(0.5 + f * .3).toFixed(2)}"/>`;
      return `<g class="rv-bend${hot ? " hot" : ""}">
        ${cur}${meander}${foam}
        <text x="18" y="${y - bulge / 2 - 6}" class="rv-name">${esc((m.name || w.prov).slice(0, 7))}</text>
        <text x="${W - 18}" y="${y - bulge / 2 - 6}" class="rv-pct" text-anchor="end">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // fish — sessions swimming along the nearest lane
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const lane = i % n;
      const y = 34 + laneH * lane + laneH / 2 + (rnd() - .5) * 8;
      const dur = Math.max(6, 16 - (s.tps || 0) / 8);
      const sz = 3 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="rv-fish${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * 2.2).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M 0 0 Q ${sz} ${-sz * .7} ${sz * 2} 0 Q ${sz} ${sz * .7} 0 0 Z" fill="${dead ? "var(--red)" : m.color || "#d9a05a"}"/>
        <path d="M ${sz * 2} 0 L ${sz * 2.8} ${-sz * .5} L ${sz * 2.8} ${sz * .5} Z" fill="${dead ? "var(--red)" : m.color || "#d9a05a"}"/>
        <circle cx="${sz * .6}" cy="${-sz * .15}" r="${sz * .16}" fill="var(--bg)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rv-wrap">
        <div class="rv-head"><b>RIVER</b><span>湾=配额窗 宽=用量 鱼=会话${hotN ? " · " + hotN + " 湾泛红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14202a 38%, transparent)" rx="10"/>
          ${bends}${fish}
          <g class="rv-card">
            <rect x="14" y="10" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="28" class="rv-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="41" class="rv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "河流", eyebrow: "RIVER", render };
})();
