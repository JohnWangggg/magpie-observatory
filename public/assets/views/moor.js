/* ------------------------------------------------------------------ moor
 * Moor — a windswept heather moor under scudding clouds: every
 * quota window is a cairn whose height = used % (≥85% the top
 * stone glows amber); sessions are sheep drifting across the fell.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "moor";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(10112233);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 230;

    // overcast sky
    const sky = `<defs><linearGradient id="mm-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a4045"/><stop offset="100%" stop-color="#4a5055"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#mm-s)" rx="10"/>`;
    // heather tufts
    let heather = "";
    for (let i = 0; i < 20; i++) {
      heather += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + rnd() * 18).toFixed(1)}" rx="${(3 + rnd() * 6).toFixed(1)}" ry="${(2 + rnd() * 3).toFixed(1)}" fill="#5a4a60" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }
    // bog
    const bog = `<ellipse cx="${W / 2}" cy="${GY + 40}" rx="${W * .3}" ry="8" fill="#3a3038" opacity=".6"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #3a3830 70%, var(--card-2))"/>`;

    // cairns — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const cairns = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a6a5a";
      const ch = 18 + f * 75;
      const cw = 14 + f * 22;
      const topY = GY - ch;
      // stacked stones
      let stones = "";
      const stoneCount = 3 + Math.floor(f * 3);
      for (let s2 = 0; s2 < stoneCount; s2++) {
        const sy = GY - (s2 / stoneCount) * ch;
        const sh = ch / stoneCount;
        const sw2 = cw * (1 - (s2 / stoneCount) * .4);
        const dx = (rnd() - .5) * 4;
        stones += `<ellipse cx="${(cx + dx).toFixed(1)}" cy="${(sy + sh * .5).toFixed(1)}" rx="${(sw2 / 2).toFixed(1)}" ry="${(sh * .4).toFixed(1)}" fill="color-mix(in srgb, ${col} ${(50 + s2 * 12)}%, #3a3530)"/>`;
      }
      // amber glow on top stone
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY + 5}" rx="${cw * .4}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${cw * .4};${cw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.2" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="mm-cairn${hot ? " hot" : ""}">
        ${stones}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="mm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="mm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sheep — sessions drifting across
    const sheep = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 16 - (s.tps || 0) / 12);
      const y = GY + 20 + (i % 2) * 12;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e0d0");
      return `<g class="mm-sheep${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 3).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .8}" fill="${col}"/>
        <ellipse cx="${size * 1.2}" cy="${-size * .3}" rx="${size * .4}" ry="${size * .35}" fill="${col}"/>
        <ellipse cx="${-size * .8}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}" opacity=".6"/>
        <line x1="${-size * 1.4}" y1="${size * .3}" x2="${-size * 1.4}" y2="${size * .8}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.4}" y1="${size * .3}" x2="${size * 1.4}" y2="${size * .8}" stroke="${col}" stroke-width=".8"/>
        <circle cx="${size * 1.3}" cy="${-size * .25}" r="${size * .12}" fill="${col}" opacity=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mm-wrap">
        <div class="mm-head"><b>MOOR</b><span>石堆=配额窗 高=用量 羊=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${ground}${bog}${heather}${cairns}${sheep}
          <g class="mm-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mm-k">${fmt(k.tokens)} · ${sessions.length} 羊</text>
            <text x="22" y="45" class="mm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "荒野", eyebrow: "MOOR", render };
})();
