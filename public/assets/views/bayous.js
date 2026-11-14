/* ------------------------------------------------------------------ bayous
 * Bayous — cypress knees rising from dark swamp water: every
 * quota window is a cypress whose trunk height = used %
 * (≥85% the moss glows amber); sessions are herons stalking
 * the shallows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bayous";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66448800);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 205, GY = 248;

    // humid sky
    const sky = `<defs><linearGradient id="bi-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8c8b8"/><stop offset="100%" stop-color="#d0d8c8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bi-s)" rx="10"/>`;
    // mist
    const mist = `<rect x="0" y="${WY - 25}" width="${W}" height="30" fill="#c0d0c0" opacity=".3" rx="6"/>`;
    // dark water
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #30483c 70%, var(--card-2))"/>`;
    // duckweed dots
    let duck = "";
    for (let i = 0; i < 20; i++) {
      duck += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(WY + 5 + rnd() * 35).toFixed(1)}" r="${(1 + rnd() * 2).toFixed(1)}" fill="#587848" opacity="${(.3 + rnd() * .25).toFixed(2)}"/>`;
    }
    // mud bank
    const bank = `<path d="M 0 ${GY} L 0 ${GY - 6} L 60 ${GY - 10} L 130 ${GY - 5} L 200 ${GY - 12} L 270 ${GY - 7} L 340 ${GY - 10} L 400 ${GY - 8} L 400 ${GY} Z" fill="#4a4a38" opacity=".6"/>`;

    // cypresses — trunk height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const trees = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#486048";
      const th = 25 + f * 75;
      const tw = 8 + f * 12;
      const topY = WY - th;
      // trunk — flared base
      const trunk = `<path d="M ${cx - tw / 2} ${WY} L ${cx - tw * .2} ${topY} L ${cx + tw * .2} ${topY} L ${cx + tw / 2} ${WY} Z" fill="color-mix(in srgb, #685848 60%, #4a4038)"/>`;
      // knees — small roots at waterline
      const knees = `<path d="M ${cx - tw * .7} ${WY} L ${cx - tw * .6} ${WY - 8} L ${cx - tw * .5} ${WY} Z" fill="#5a5040" opacity=".7"/>
        <path d="M ${cx + tw * .6} ${WY} L ${cx + tw * .7} ${WY - 6} L ${cx + tw * .8} ${WY} Z" fill="#5a5040" opacity=".6"/>`;
      // canopy — sparse feathery top
      const leafN = Math.round(2 + f * 5);
      let canopy = "";
      for (let l = 0; l < leafN; l++) {
        const lx = cx + (rnd() - .5) * tw * 2.2;
        const ly = topY + (rnd() - .5) * 15;
        canopy += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(4 + rnd() * 5).toFixed(1)}" ry="${(3 + rnd() * 3).toFixed(1)}" fill="color-mix(in srgb, ${col} ${50 + f * 25}%, #587050)" opacity="${(.55 + f * .2).toFixed(2)}"/>`;
      }
      // spanish moss strands
      let moss = "";
      const mossN = Math.round(1 + f * 3);
      for (let mo = 0; mo < mossN; mo++) {
        const mx = cx + (rnd() - .5) * tw * 1.8;
        const my = topY + 5 + rnd() * 10;
        const ml = 8 + rnd() * 15;
        moss += `<path d="M ${mx.toFixed(1)} ${my.toFixed(1)} Q ${(mx + 2).toFixed(1)} ${(my + ml / 2).toFixed(1)} ${(mx - 1).toFixed(1)} ${(my + ml).toFixed(1)}" stroke="${hot ? "var(--amber)" : "#98a888"}" stroke-width="1" fill="none" opacity="${hot ? ".6" : ".45"}"/>`;
      }
      // hot amber glow in canopy
      const glow = hot ? `<circle cx="${cx}" cy="${topY}" r="${(5 + f * 4).toFixed(1)}" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="${(5 + f * 4).toFixed(1)};${(8 + f * 5).toFixed(1)}" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.08" dur="2.2s" repeatCount="indefinite"/></circle>` : "";
      // reflection
      const refl = `<path d="M ${cx - tw * .3} ${WY + 3} L ${cx + tw * .3} ${WY + 3} L ${cx + tw * .15} ${WY + th * .35} L ${cx - tw * .15} ${WY + th * .35} Z" fill="${col}" opacity=".12"/>`;
      return `<g class="bi-tree${hot ? " hot" : ""}">
        ${trunk}${knees}${canopy}${moss}${glow}${refl}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="bi-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="bi-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // herons — stalking the shallows
    const herons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 12);
      const y = WY + 20 + (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#8898a8");
      const x0 = 30 + (i * 60) % (W - 60);
      return `<g class="bi-heron${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x0} ${y};${(x0 + 40).toFixed(1)} ${(y - 3).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .1} Q ${size * .9} ${-size * .9} ${size * 1.2} ${-size * .5}" stroke="${col}" stroke-width="1.2" fill="none"/>
        <circle cx="${size * 1.2}" cy="${-size * .5}" r="${size * .25}" fill="${col}"/>
        <line x1="${size * .3}" y1="${size * .4}" x2="${size * .35}" y2="${size * 1.3}" stroke="${col}" stroke-width=".4"/>
        <line x1="${size * .1}" y1="${size * .4}" x2="${size * .05}" y2="${size * 1.3}" stroke="${col}" stroke-width=".4"/>
        <line x1="${size * 1.4}" y1="${-size * .45}" x2="${size * 2.1}" y2="${-size * .4}" stroke="${col}" stroke-width=".5" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bi-wrap">
        <div class="bi-head"><b>BAYOUS</b><span>柏=配额窗 干高=用量 鹭=会话${hotN ? " · " + hotN + " 燃藓" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${mist}${water}${duck}${bank}${trees}${herons}
          <g class="bi-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bi-k">${fmt(k.tokens)} · ${sessions.length} 鹭</text>
            <text x="22" y="45" class="bi-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沼泽", eyebrow: "BAYOUS", render };
})();
