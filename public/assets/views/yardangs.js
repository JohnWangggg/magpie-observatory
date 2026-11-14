/* ------------------------------------------------------------------ yardangs
 * Yardangs — wind-carved ridges aligned to the gale: every
 * quota window is a yardang whose streamlining = used %
 * (≥85% the abraded prow burns amber); sessions are desert
 * foxes trotting the corridors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "yardangs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(38548909);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // dust-haze sky
    const sky = `<defs><linearGradient id="ya-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8b898"/><stop offset="100%" stop-color="#e8d0b0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ya-s)" rx="10"/>`;
    // wind streaks
    let wind = "";
    for (let i = 0; i < 8; i++) {
      wind += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(30 + rnd() * 150).toFixed(1)}" x2="${(rnd() * W + 40).toFixed(1)}" y2="${(28 + rnd() * 150).toFixed(1)}" stroke="#e8d0b0" stroke-width=".8" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }
    // reg floor
    const floor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c09868 55%, var(--card-2))"/>`;

    // yardangs — streamlined hulls, streamlining = used %
    const n = Math.max(1, quotas.length);
    const rows = Math.min(n, 3);
    const cols = Math.ceil(n / rows);
    const hulls = quotas.map((w, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const cx = 55 + (W - 110) / (inRow + 1) * (col + 1);
      const cy = GY - 15 - row * 22;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const colr = m.color || "#b08858";
      const len = 16 + f * 30;
      const ht = 8 + f * 10;
      // hull — blunt prow left (windward), tapered tail right
      const hull = `<path d="M ${cx - len / 2} ${cy} Q ${cx - len * .45} ${cy - ht} ${cx - len * .1} ${cy - ht * .9} Q ${cx + len * .4} ${cy - ht * .4} ${cx + len / 2} ${cy} Z" fill="color-mix(in srgb, ${colr} 70%, #986838)"/>`;
      // abrasion grooves
      const grooves = `<path d="M ${cx - len * .3} ${cy - ht * .3} L ${cx + len * .3} ${cy - ht * .2} M ${cx - len * .25} ${cy - ht * .55} L ${cx + len * .15} ${cy - ht * .5}" stroke="#785028" stroke-width=".6" opacity=".5"/>`;
      // prow cap
      const prow = `<ellipse cx="${cx - len / 2 + 2}" cy="${cy - ht * .4}" rx="3" ry="2" fill="${hot ? "var(--amber)" : "#d8b888"}" opacity="${hot ? ".9" : ".7"}"/>`;
      const glow = hot ? `<circle cx="${cx - len / 2 + 2}" cy="${cy - ht * .4}" r="7" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.05" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="ya-hull${hot ? " hot" : ""}">
        ${hull}${grooves}${prow}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ya-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ya-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fennec foxes — trotting the corridors
    const foxes = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 8 - (i % 3) * 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#d8b080");
      return `<g class="ya-fox${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-15} ${y};${W + 15} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .45}" fill="${col}"/>
        <circle cx="${size * .7}" cy="${-size * .35}" r="${size * .35}" fill="${col}"/>
        <path d="M ${size * .6} ${-size * .6} L ${size * .5} ${-size * 1.5} L ${size * .8} ${-size * .8} Z" fill="${col}"/>
        <path d="M ${size * .9} ${-size * .6} L ${size * 1.1} ${-size * 1.5} L ${size * 1.2} ${-size * .7} Z" fill="${col}"/>
        <path d="M ${-size * .7} ${size * .2} Q ${-size * 1.5} ${size * .6} ${-size * 1.6} ${size * .1}" stroke="${col}" stroke-width="1" fill="none"/>
        <line x1="${size * .4}" y1="${size * .4}" x2="${size * .4}" y2="${size * 1.1}" stroke="${col}" stroke-width=".6"/>
        <line x1="${-size * .4}" y1="${size * .4}" x2="${-size * .4}" y2="${size * 1.1}" stroke="${col}" stroke-width=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ya-wrap">
        <div class="ya-head"><b>YARDANGS</b><span>雅丹=配额窗 流线=用量 耳廓狐=会话${hotN ? " · " + hotN + " 燃艏" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${wind}${floor}${hulls}${foxes}
          <g class="ya-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ya-k">${fmt(k.tokens)} · ${sessions.length} 狐</text>
            <text x="22" y="45" class="ya-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雅丹", eyebrow: "YARDANGS", render };
})();
