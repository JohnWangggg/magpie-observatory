/* ------------------------------------------------------------------ springs
 * Springs — clear mountain springs bubbling out of rock: every
 * quota window is a spring whose jet arc = used % (≥85% the
 * source glows amber); sessions are wagtails bobbing at the
 * brink.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "springs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99771133);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // mountain sky
    const sky = `<defs><linearGradient id="sg-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8d0e0"/><stop offset="100%" stop-color="#d8e8f0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sg-s)" rx="10"/>`;
    // rock face
    const rock = `<path d="M 0 ${GY} L 0 ${GY - 70} L 50 ${GY - 90} L 110 ${GY - 70} L 170 ${GY - 95} L 240 ${GY - 75} L 310 ${GY - 92} L 370 ${GY - 78} L 400 ${GY - 85} L 400 ${GY} Z" fill="#788088" opacity=".35"/>`;
    // ground — mossy rocks
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #688068 55%, var(--card-2))"/>`;
    let moss = "";
    for (let i = 0; i < 10; i++) {
      moss += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 30).toFixed(1)}" rx="${(3 + rnd() * 6).toFixed(1)}" ry="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="#587858" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }
    // stream at the bottom
    const stream = `<path d="M 0 ${H - 8} Q 100 ${H - 14} 200 ${H - 8} Q 300 ${H - 2} 400 ${H - 8} L 400 ${H} L 0 ${H} Z" fill="color-mix(in srgb, #58a0c0 55%, var(--card-2))"/>`;

    // springs — jet arc = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const springs = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#58a0b8";
      const jh = 15 + f * 65;
      const rw = 10 + f * 15;
      const srcY = GY - 15;
      // source rock
      const rock2 = `<ellipse cx="${cx}" cy="${srcY}" rx="${rw}" ry="${rw * .5}" fill="color-mix(in srgb, ${col} 30%, #687078)"/>`;
      // water jet — parabolic arc
      const jetX = cx + rw * .8;
      const jet = `<path d="M ${cx} ${srcY - 3} Q ${(cx + jetX) / 2} ${srcY - jh} ${jetX} ${srcY + 8}" stroke="#c0e0f0" stroke-width="${(1.5 + f * 2).toFixed(1)}" fill="none" opacity="${(.55 + f * .3).toFixed(2)}" stroke-linecap="round">
        <animate attributeName="stroke-width" values="${(1.5 + f * 2).toFixed(1)};${(1 + f * 1.5).toFixed(1)};${(1.5 + f * 2).toFixed(1)}" dur="${(1.5 - f * .5).toFixed(2)}s" repeatCount="indefinite"/></path>`;
      // droplets
      const drop1 = `<circle cx="${(cx + jetX) / 2 + 3}" cy="${srcY - jh * .7}" r="1.5" fill="#d0ecf8" opacity=".7">
        <animate attributeName="cy" values="${srcY - jh * .7};${srcY + 10}" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.2s" repeatCount="indefinite"/></circle>`;
      // splash pool
      const pool = `<ellipse cx="${jetX}" cy="${srcY + 10}" rx="${rw * .7}" ry="${rw * .2}" fill="color-mix(in srgb, ${col} 60%, #488098)" opacity=".7"/>`;
      // hot amber source glow
      const glow = hot ? `<circle cx="${cx}" cy="${srcY - 3}" r="${(4 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".5">
        <animate attributeName="r" values="${(4 + f * 3).toFixed(1)};${(7 + f * 4).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.12" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="sg-spring${hot ? " hot" : ""}">
        ${rock2}${jet}${drop1}${pool}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // wagtails — bobbing at the brink
    const wags = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const y = GY - 20;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0d040");
      const rx2 = 8 + rnd() * 8;
      return `<g class="sg-wag${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} L ${(cx2 + rx2).toFixed(1)} ${y} L ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .4}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .2}" r="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .8} 0 L ${-size * 1.7} ${-size * .3}" stroke="${col}" stroke-width=".8" fill="none">
          <animateTransform attributeName="transform" type="rotate" values="-15 ${-size * .8} 0;15 ${-size * .8} 0;-15 ${-size * .8} 0" dur=".4s" repeatCount="indefinite"/></path>
        <line x1="0" y1="${size * .3}" x2="0" y2="${size * .9}" stroke="${col}" stroke-width=".3"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sg-wrap">
        <div class="sg-head"><b>SPRINGS</b><span>泉=配额窗 弧高=用量 鹡鸰=会话${hotN ? " · " + hotN + " 燃源" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${rock}${ground}${moss}${stream}${springs}${wags}
          <g class="sg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sg-k">${fmt(k.tokens)} · ${sessions.length} 鸰</text>
            <text x="22" y="45" class="sg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "山泉", eyebrow: "SPRINGS", render };
})();
