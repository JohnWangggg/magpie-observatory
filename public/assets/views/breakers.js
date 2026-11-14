/* ------------------------------------------------------------------ breakers
 * Breakers — ocean waves curling onto a beach: every quota
 * window is a breaker whose curl height = used % (≥85% the
 * foam burns amber); sessions are surfers riding the face.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "breakers";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22993355);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 248;

    // surf sky
    const sky = `<defs><linearGradient id="br-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#98c8dc"/><stop offset="100%" stop-color="#c8e0e8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#br-s)" rx="10"/>`;
    // open sea
    const sea = `<rect x="0" y="${GY - 110}" width="${W}" height="110" fill="color-mix(in srgb, #2890b0 62%, var(--card-2))"/>`;
    // shore break foam
    const foam = `<path d="M 0 ${GY} L 0 ${GY - 12} Q 100 ${GY - 22} 200 ${GY - 14} Q 300 ${GY - 24} 400 ${GY - 16} L 400 ${GY} Z" fill="#e0f0f4" opacity=".7"/>`;
    // sand
    const sand = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #d8c8a0 65%, var(--card-2))"/>`;

    // breakers — curl height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const waves = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#30a0c0";
      const wh = 15 + f * 65;
      const ww = 16 + f * 26;
      const baseY = GY - 8;
      const topY = baseY - wh;
      // curling wave — face + barrel
      const face = `<path d="M ${cx - ww / 2} ${baseY} Q ${cx - ww * .3} ${topY + wh * .3} ${cx} ${topY} Q ${cx + ww * .5} ${topY + 8} ${cx + ww * .35} ${topY + wh * .4} L ${cx + ww / 2} ${baseY} Z" fill="color-mix(in srgb, ${col} 65%, #2088a8)"/>`;
      // barrel curl — white lip
      const lip = `<path d="M ${cx} ${topY} Q ${cx + ww * .5} ${topY + 6} ${cx + ww * .42} ${topY + wh * .35}" stroke="#e8f8fc" stroke-width="${(2.5 + f * 2).toFixed(1)}" fill="none" opacity=".8" stroke-linecap="round"/>`;
      // foam spray off the lip
      const spray = hot ? `<circle cx="${cx + ww * .35}" cy="${topY + wh * .3}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7"/>
        <circle cx="${cx + ww * .4}" cy="${topY + wh * .2}" r="${(2 + f * 1.5).toFixed(1)}" fill="var(--amber)" opacity=".5"/>
        <circle cx="${cx + ww * .3}" cy="${topY + wh * .15}" r="${(2.5 + f * 1.5).toFixed(1)}" fill="#f0fcff" opacity=".6"/>` :
        `<circle cx="${cx + ww * .4}" cy="${topY + wh * .2}" r="2" fill="#f0fcff" opacity=".5"/>`;
      const glow = hot ? `<circle cx="${cx + ww * .3}" cy="${topY + 8}" r="${(5 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="${(5 + f * 3).toFixed(1)};${(9 + f * 4).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      // foam trail at base
      const trail = `<ellipse cx="${cx}" cy="${baseY + 4}" rx="${ww * .7}" ry="3" fill="#e0f0f4" opacity=".5"/>`;
      return `<g class="br-wave${hot ? " hot" : ""}">
        ${face}${lip}${spray}${glow}${trail}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="br-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="br-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // surfers — riding the face
    const surfers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const f2 = row ? Math.min(1, row.used / 100) : 0;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const y = GY - 8 - (15 + f2 * 65) * .5;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0a030");
      const rx2 = 8 + rnd() * 6;
      return `<g class="br-surf${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} L ${(cx2 + rx2).toFixed(1)} ${(y - 8).toFixed(1)} L ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="${size * .8}" rx="${size * 1.6}" ry="${size * .3}" fill="${col}" opacity=".9"/>
        <ellipse cx="0" cy="0" rx="${size * .45}" ry="${size * .9}" fill="${col}"/>
        <circle cx="0" cy="${-size * .8}" r="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .3} ${-size * .3} L ${-size * 1} ${-size * .7}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * .3} ${-size * .3} L ${size * .9} ${-size * .9}" stroke="${col}" stroke-width=".6" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="br-wrap">
        <div class="br-head"><b>BREAKERS</b><span>浪=配额窗 卷高=用量 冲浪者=会话${hotN ? " · " + hotN + " 燃沫" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${foam}${sand}${waves}${surfers}
          <g class="br-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="br-k">${fmt(k.tokens)} · ${sessions.length} 浪客</text>
            <text x="22" y="45" class="br-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "碎浪", eyebrow: "BREAKERS", render };
})();
