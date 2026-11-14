/* -------------------------------------------------------------------- tundra
 * Tundra — snow-covered mounds under a pale sky: every quota window
 * is a drift whose snowcap grows as used % climbs (≥85% the cap
 * turns rose-frost); sessions are reindeer crossing the flats.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tundra";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(81118121);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // drifting snowflakes
    let flakes = "";
    for (let i = 0; i < 22; i++) {
      const fx = rnd() * W, fy = rnd() * (GY - 30), r = .6 + rnd() * 1.4;
      flakes += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${r.toFixed(1)}" fill="#dfe8f0" opacity="${(.2 + rnd() * .4).toFixed(2)}">
        <animate attributeName="cy" values="${fy.toFixed(1)};${(fy + 26).toFixed(1)}" dur="${(3 + rnd() * 4).toFixed(1)}s" begin="${(-rnd() * 4).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="${(3 + rnd() * 4).toFixed(1)}s" begin="${(-rnd() * 4).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    }

    // mounds — cap height = used %
    const mounds = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a8c4d9";
      const mw = gap * .34, mh = 14 + f * 62;
      const snowCol = hot ? "var(--red)" : "#e8f0f5";
      // drift shape
      const d = `M ${cx - mw} ${GY} Q ${cx - mw * .8} ${GY - mh * .7} ${cx - mw * .3} ${GY - mh * .85}
               Q ${cx} ${GY - mh * 1.1} ${cx + mw * .3} ${GY - mh * .85}
               Q ${cx + mw * .8} ${GY - mh * .7} ${cx + mw} ${GY} Z`;
      // frost sparkle when hot
      const sparkle = hot ? Array.from({ length: 3 }, (_, k) =>
        `<circle cx="${(cx + (k - 1) * 8).toFixed(1)}" cy="${(GY - mh - 4 - k * 2).toFixed(1)}" r="1.2" fill="var(--red)">
          <animate attributeName="opacity" values="0;.9;0" dur="1.6s" begin="${(-k * .5).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("") : "";
      // icy rim
      const rim = `<path d="M ${cx - mw} ${GY} Q ${cx - mw * .5} ${GY - mh * .5} ${cx - mw * .3} ${GY - mh * .85} Q ${cx} ${GY - mh * 1.1} ${cx + mw * .3} ${GY - mh * .85} Q ${cx + mw * .5} ${GY - mh * .5} ${cx + mw} ${GY}"
        fill="none" stroke="${snowCol}" stroke-width="1.4" opacity=".9"/>`;
      return `<g class="tu-mound${hot ? " hot" : ""}">
        <path d="${d}" fill="color-mix(in srgb, ${col} ${30 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        ${rim}${sparkle}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="tu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="tu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // reindeer — sessions crossing the flats
    const herd = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 20 - (s.tps || 0) / 8);
      const y = GY - 6 - (i % 3) * 12;
      const size = 3.5 + Math.min(3.5, (s.tokens || 0) / 50000);
      return `<g class="tu-deer${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24} ${y.toFixed(1)};${W + 24} ${(y + 3).toFixed(1)}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .9}" fill="${dead ? "var(--red)" : m.color || "#c9a582"}"/>
        <circle cx="${size * 1.4}" cy="${-size * .9}" r="${size * .65}" fill="${dead ? "var(--red)" : m.color || "#c9a582"}"/>
        <path d="M ${size * 1.4} ${-size * 1.4} L ${size * 1.9} ${-size * 2.2} M ${size * 1.4} ${-size * 1.4} L ${size * 1.0} ${-size * 2.1} M ${size * 1.4} ${-size * 1.4} L ${size * 1.7} ${-size * 1.7}"
          stroke="#7a5a3a" stroke-width="1" fill="none"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * .8}" y2="${size * 1.7}" stroke="#5a4632" stroke-width="1.2"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * .8}" y2="${size * 1.7}" stroke="#5a4632" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tu-wrap">
        <div class="tu-head"><b>TUNDRA</b><span>丘=配额窗 雪=用量 羚=会话${hotN ? " · " + hotN + " 丘霜红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2028 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c9d5e0" opacity=".5"/>
          ${flakes}${mounds}${herd}
          <g class="tu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="tu-k">${fmt(k.tokens)} · ${sessions.length} 羚</text>
            <text x="22" y="45" class="tu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "苔原", eyebrow: "TUNDRA", render };
})();
