/* ------------------------------------------------------------------ rainforest
 * Rainforest — a cloud forest canopy under perpetual drizzle:
 * every quota window is a rain cell whose downpour intensity
 * = used % (≥85% the cell flashes amber); sessions are sloths
 * hanging from the boughs.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rainforest";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232;

    // overcast sky
    const sky = `<defs><linearGradient id="ra-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a3530"/><stop offset="100%" stop-color="#3a4540"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ra-s)" rx="10"/>`;
    // canopy silhouette
    const canopy = `<path d="M 0 0 L 0 45 L 30 38 L 80 50 L 150 35 L 220 48 L 290 32 L 360 44 L 400 36 L 400 0 Z" fill="#0a1a12" opacity=".85"/>`;
    // mist
    const mist = `<rect x="0" y="${GY - 25}" width="${W}" height="25" fill="#4a5a50" opacity=".15"/>`;
    // forest floor
    const floor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a2a20 75%, var(--card-2))"/>`;
    // rain streaks (background)
    let bgRain = "";
    for (let i = 0; i < 15; i++) {
      const rx = rnd() * W;
      const ry = rnd() * (GY - 40);
      bgRain += `<line x1="${rx.toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(rx - 2).toFixed(1)}" y2="${(ry + 8).toFixed(1)}" stroke="#5a7a6a" stroke-width=".5" opacity="${(.1 + rnd() * .1).toFixed(2)}"/>`;
    }

    // rain cells — downpour intensity = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const cells = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a8a6a";
      const cw = 14 + f * 22;
      const cy2 = 55;
      // cloud mass
      const cloud = `<ellipse cx="${cx}" cy="${cy2}" rx="${cw}" ry="${(cw * .3).toFixed(1)}" fill="color-mix(in srgb, ${col} 50%, #4a5a50)"/>`;
      // rain — downpour
      let rain = "";
      const dropCount = 2 + Math.floor(f * 4);
      for (let d = 0; d < dropCount; d++) {
        const dx = cx + (rnd() - .5) * cw * .7;
        const len = 20 + rnd() * 30;
        rain += `<line x1="${dx.toFixed(1)}" y1="${cy2 + 8}" x2="${(dx - 3).toFixed(1)}" y2="${cy2 + 8 + len}" stroke="color-mix(in srgb, ${col} 60%, #8aa8a0)" stroke-width="${(1 + f * 1.5).toFixed(1)}" opacity="${(.3 + rnd() * .2).toFixed(2)}">
          <animate attributeName="y1" values="${cy2 + 8};${cy2 + 8 + len}" dur="${(0.8 + rnd() * .6).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="${cy2 + 8 + len};${cy2 + 8 + len * 2}" dur="${(0.8 + rnd() * .6).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(.3 + rnd() * .2).toFixed(2)};0" dur="${(0.8 + rnd() * .6).toFixed(1)}s" repeatCount="indefinite"/></line>`;
      }
      // hot amber flash
      const flash = hot ? `<ellipse cx="${cx}" cy="${cy2}" rx="${cw * .5}" ry="${cw * .15}" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${cw * .5};${cw * .8}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.1" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ra-cell${hot ? " hot" : ""}">
        ${cloud}${rain}${flash}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ra-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ra-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sloths — hanging from boughs
    const sloths = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 18 - (s.tps || 0) / 10);
      const y = GY - 25 - (i % 2) * 15;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#8a7a5a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      return `<g class="ra-sloth${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${(cx2 + 30).toFixed(1)} ${y};${(cx2 - 30).toFixed(1)} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .7}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .2}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .8} ${size * .3} Q ${-size * 1.2} ${size * .8} ${-size * .6} ${size * 1.2}" stroke="${col}" stroke-width=".7" fill="none"/>
        <circle cx="${size * 1}" cy="${-size * .25}" r="${size * .12}" fill="${col}" opacity=".8"/>
        <circle cx="${-size * .3}" cy="${-size * .3}" r="${size * .1}" fill="${col}" opacity=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ra-wrap">
        <div class="ra-head"><b>RAINFOREST</b><span>雨团=配额窗 雨强=用量 树懒=会话${hotN ? " · " + hotN + " 闪雨" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${canopy}${mist}${floor}${bgRain}${cells}${sloths}
          <g class="ra-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ra-k">${fmt(k.tokens)} · ${sessions.length} 懒</text>
            <text x="22" y="45" class="ra-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雨层林", eyebrow: "RAINFOREST", render };
})();
