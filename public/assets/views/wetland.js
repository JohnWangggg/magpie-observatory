/* ------------------------------------------------------------------- wetland
 * Wetland — a marsh at dawn: every quota window is a reed-bed whose
 * water level rises as used % climbs (≥85% it brims over with red
 * water); sessions are herons stalking between the pools.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wetland";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11490703);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, MUD = 232;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // reed-beds — water level rises with used %, brims red when hot
    const beds = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const water = 6 + f * 46;                                // water depth in the bed
      const col = m.color || "#4a7a8a";
      const reeds = 3 + Math.round(f * 4);
      let reed = "";
      for (let r = 0; r < reeds; r++) {
        const rx = cx - gap * .3 + (gap * .6) * (r / Math.max(1, reeds - 1));
        const rh = 16 + f * 40 + (r % 2) * 8;
        reed += `<line x1="${rx.toFixed(1)}" y1="${MUD - water}" x2="${rx.toFixed(1)}" y2="${(MUD - water - rh).toFixed(1)}" stroke="#5a7a3a" stroke-width="1.4"/>
                 <ellipse cx="${rx.toFixed(1)}" cy="${(MUD - water - rh - 4).toFixed(1)}" rx="2" ry="4" fill="#6a8a4a"/>`;
      }
      // overflow rivulets when hot
      const brin = hot ? `<path d="M ${(cx - gap * .3).toFixed(1)} ${MUD} q ${gap * .1} 6 ${gap * .3} 8 q ${gap * .2} 2 ${gap * .3} -4" fill="none" stroke="var(--red)" stroke-width="2" opacity=".7"/>` : "";
      // water plane
      const waterEl = `<rect x="${(cx - gap * .38).toFixed(1)}" y="${(MUD - water).toFixed(1)}" width="${(gap * .76).toFixed(1)}" height="${water.toFixed(1)}" rx="2"
          fill="color-mix(in srgb, ${hot ? "var(--red)" : col} ${34 + f * 24}%, transparent)" stroke="${col}" stroke-opacity=".4"/>`;
      return `<g class="wt-bed${hot ? " hot" : ""}">
        ${waterEl}${reed}${brin}
        <text x="${cx.toFixed(1)}" y="${MUD + 18}" class="wt-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${MUD + 29}" class="wt-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // herons — sessions stalking between the beds
    const herons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 20 - (s.tps || 0) / 8);
      const y = MUD - 60 - rnd() * 100;
      return `<g class="wt-heron${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 10).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.6).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="5" ry="3" fill="${dead ? "var(--red)" : m.color || "#cfd8dc"}"/>
        <line x1="4" y1="-2" x2="10" y2="-8" stroke="${dead ? "var(--red)" : m.color || "#cfd8dc"}" stroke-width="1.4"/>
        <circle cx="10" cy="-8" r="2" fill="${dead ? "var(--red)" : m.color || "#cfd8dc"}"/>
        <line x1="10" y1="-8" x2="14" y2="-10" stroke="#e8b25a" stroke-width="1.2"/>
        <line x1="-1" y1="3" x2="-1" y2="10" stroke="#4a4a4a" stroke-width="1"/>
        <line x1="2" y1="3" x2="2" y2="10" stroke="#4a4a4a" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wt-wrap">
        <div class="wt-head"><b>WETLAND</b><span>泽=配额窗 深=用量 鹭=会话${hotN ? " · " + hotN + " 泽漫" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14221c 40%, transparent)" rx="10"/>
          <rect x="14" y="${MUD}" width="${W - 28}" height="3" rx="1.5" fill="#3a3228" opacity=".9"/>
          ${beds}${herons}
          <g class="wt-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="wt-k">${fmt(k.tokens)} · ${sessions.length} 鹭</text>
            <text x="22" y="45" class="wt-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湿地", eyebrow: "WETLAND", render };
})();
