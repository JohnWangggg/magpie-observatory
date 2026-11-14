/* ------------------------------------------------------------------ hedges
 * Hedges — clipped topiary in a formal garden: every quota
 * window is a hedge mound whose height = used % (≥85% the
 * trim line burns amber); sessions are ladybirds crawling
 * along the leafy walls.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hedges";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66557788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // formal garden sky
    const sky = `<defs><linearGradient id="hg-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8e8d8"/><stop offset="100%" stop-color="#e8f0e0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hg-s)" rx="10"/>`;
    // gravel path
    const path = `<path d="M 0 ${GY} L 0 ${GY + 20} L 60 ${GY + 15} L 130 ${GY + 25} L 200 ${GY + 18} L 270 ${GY + 28} L 340 ${GY + 20} L 400 ${GY + 25} L 400 ${GY} Z" fill="#c8c0a8" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #98a878 55%, var(--card-2))"/>`;
    // border flowers
    let flowers = "";
    for (let i = 0; i < 12; i++) {
      flowers += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 12 + rnd() * 25).toFixed(1)}" r="${(1 + rnd() * 1.5).toFixed(1)}" fill="${["#c04050","#e8a830","#8068b8"][i % 3]}" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }

    // hedge mounds — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const mounds = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a8048";
      const mh = 15 + f * 70;
      const mw = 18 + f * 28;
      const topY = GY - mh;
      // clipped mound — rounded topiary
      const shape = `<path d="M ${cx - mw / 2} ${GY} L ${cx - mw * .45} ${topY + 12} Q ${cx - mw * .3} ${topY} ${cx} ${topY - 3} Q ${cx + mw * .3} ${topY} ${cx + mw * .45} ${topY + 12} L ${cx + mw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #4a7040)"/>`;
      // trim line — the flat top
      const trim = `<line x1="${cx - mw * .35}" y1="${topY - 3}" x2="${cx + mw * .35}" y2="${topY - 3}" stroke="color-mix(in srgb, ${col} 70%, #385828)" stroke-width="1.5" opacity=".7"/>`;
      // leaf texture dots
      let dots = "";
      const dotN = Math.round(3 + f * 6);
      for (let d = 0; d < dotN; d++) {
        dots += `<circle cx="${(cx + (rnd() - .5) * mw * .7).toFixed(1)}" cy="${(topY + 8 + rnd() * (mh - 20)).toFixed(1)}" r="${(1 + rnd() * 1.5).toFixed(1)}" fill="color-mix(in srgb, ${col} 65%, #385828)" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
      }
      // hot amber trim line
      const glow = hot ? `<line x1="${cx - mw * .35}" y1="${topY - 5}" x2="${cx + mw * .35}" y2="${topY - 5}" stroke="var(--amber)" stroke-width="2" opacity=".6">
        <animate attributeName="opacity" values=".6;.15;.6" dur="1.8s" repeatCount="indefinite"/></line>` : "";
      return `<g class="hg-hedge${hot ? " hot" : ""}">
        ${shape}${trim}${dots}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="hg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="hg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ladybirds — crawling along the walls
    const bugs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cy2 = GY - (15 + (row ? Math.min(1, row.used / 100) : 0) * 70) - 5;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const size = 2 + Math.min(1.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c03030");
      return `<g class="hg-bug${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${(cx2 - 15).toFixed(1)} ${cy2.toFixed(1)};${(cx2 + 15).toFixed(1)} ${cy2.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size}" ry="${size * .6}" fill="${col}"/>
        <circle cx="${size * .5}" cy="${-size * .3}" r="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .3} ${-size * .2} L ${-size * .6} ${-size * .7}" stroke="${col}" stroke-width=".4" fill="none"/>
        <path d="M ${-size * .3} ${size * .2} L ${-size * .6} ${size * .7}" stroke="${col}" stroke-width=".4" fill="none"/>
        <circle cx="0" cy="0" r="${size * .25}" fill="#282828" opacity=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hg-wrap">
        <div class="hg-head"><b>HEDGES</b><span>绿篱=配额窗 篱高=用量 瓢虫=会话${hotN ? " · " + hotN + " 燃线" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${path}${ground}${flowers}${mounds}${bugs}
          <g class="hg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="hg-k">${fmt(k.tokens)} · ${sessions.length} 虫</text>
            <text x="22" y="45" class="hg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绿篱", eyebrow: "HEDGES", render };
})();
