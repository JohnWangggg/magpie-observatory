/* ------------------------------------------------------------------ basin
 * Basin — salt-flat polygon ridges: every quota window is a column
 * whose height = used % (≥85% the crust burns white-gold);
 * sessions are antelope threading the flats.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "basin";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99001122);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;

    // salt crust — polygon tile floor
    let crust = "";
    for (let i = 0; i < 16; i++) {
      const cx = 25 + rnd() * (W - 50), cy = GY + 6 + rnd() * 55;
      const r = 6 + rnd() * 10;
      const pts = [];
      for (let b = 0; b < 6; b++) {
        const a = b * 60 + rnd() * 20;
        pts.push(`${(cx + Math.cos(a * Math.PI / 180) * r).toFixed(1)},${(cy + Math.sin(a * Math.PI / 180) * r * .4).toFixed(1)}`);
      }
      crust += `<polygon points="${pts.join(" ")}" fill="none" stroke="#c8c8b8" stroke-width=".6" opacity="${(.1 + rnd() * .2).toFixed(2)}"/>`;
    }
    // heat shimmer on horizon
    const shimmer = `<line x1="0" y1="${GY - 2}" x2="${W}" y2="${GY - 2}" stroke="var(--amber)" stroke-width="1" opacity=".15">
      <animate attributeName="y1" values="${GY - 2};${GY - 4};${GY - 2}" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="y2" values="${GY - 2};${GY - 4};${GY - 2}" dur="3s" repeatCount="indefinite"/></line>`;

    // columns — column height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const cols = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a09080";
      const ch = 30 + f * 95;
      const cw = 12 + f * 22;
      const tipY = GY - ch;
      // column body — hexagonal sides
      const body = `<path d="M ${cx - cw / 2} ${GY} L ${cx - cw * .4} ${tipY} L ${cx + cw * .4} ${tipY} L ${cx + cw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #282018)"/>`;
      // crust top — flat surface
      const top = `<ellipse cx="${cx}" cy="${tipY}" rx="${cw * .4}" ry="${cw * .16}" fill="${hot ? "color-mix(in srgb, var(--amber) 65%, #e8e0d0)" : "#e8e0d0"}" opacity="${(.75 + f * .2).toFixed(2)}"/>`;
      // crack lines on the column
      const cracks = `<path d="M ${cx - cw * .3} ${GY - ch * .3} L ${cx - cw * .1} ${GY - ch * .5} L ${cx + cw * .15} ${GY - ch * .7}" stroke="#5a4a3a" stroke-width=".5" fill="none" opacity=".35"/>
        <path d="M ${cx + cw * .3} ${GY - ch * .2} L ${cx + cw * .1} ${GY - ch * .45}" stroke="#5a4a3a" stroke-width=".5" fill="none" opacity=".35"/>`;
      // hot ring at the crust
      const ring = hot ? `<ellipse cx="${cx}" cy="${tipY}" rx="${(cw * .5 + 3).toFixed(1)}" ry="${(cw * .2 + 2).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".6">
        <animate attributeName="rx" values="${(cw * .5 + 3).toFixed(1)};${(cw * .8 + 6).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${(cw * .2 + 2).toFixed(1)};${(cw * .32 + 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ba-col${hot ? " hot" : ""}">
        ${body}${top}${cracks}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ba-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ba-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // antelope — sessions threading the flats
    const antelope = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const y = GY - 6 - (i % 2) * 8;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8a870");
      return `<g class="ba-ant${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22} ${y};${W + 22} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .85}" fill="${col}"/>
        <circle cx="${size * 1.3}" cy="${-size * .3}" r="${size * .5}" fill="${col}"/>
        <line x1="${size * 1.4}" y1="${-size * .7}" x2="${size * 1.6}" y2="${-size * 1.8}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.6}" y1="${-size * .7}" x2="${size * 1.9}" y2="${-size * 1.7}" stroke="${col}" stroke-width=".8"/>
        <line x1="${-size * .9}" y1="${size * .5}" x2="${-size * .9}" y2="${size * 1.6}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * .8}" y1="${size * .5}" x2="${size * .8}" y2="${size * 1.6}" stroke="${col}" stroke-width=".7"/>
        <ellipse cx="${-size * 1.2}" cy="0" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ba-wrap">
        <div class="ba-head"><b>BASIN</b><span>盐柱=配额窗 高=用量 羚=会话${hotN ? " · " + hotN + " 白金" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #181410 65%, transparent)" rx="10"/>
          ${crust}${shimmer}${cols}${antelope}
          <g class="ba-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ba-k">${fmt(k.tokens)} · ${sessions.length} 羚</text>
            <text x="22" y="45" class="ba-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "盆地", eyebrow: "BASIN", render };
})();
