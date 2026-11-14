/* ----------------------------------------------------------------- escarp
 * Escarpment — sheer cliff walls catching first light: every quota
 * window is a wall whose face height = used % (≥85% the brow
 * catches fire); sessions are rock doves on the updraft.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "escarp";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;

    // dawn gradient
    const sky = `<defs><linearGradient id="es-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a2430"/><stop offset="55%" stop-color="#2a3040"/><stop offset="100%" stop-color="#4a3a38"/></linearGradient></defs>`;
    // first light shaft
    const shaft = `<polygon points="${W},0 ${W},80 320,${GY - 40} 240,${GY - 60}" fill="#c8a060" opacity=".08"/>`;
    // ledge talus
    let talus = "";
    for (let i = 0; i < 10; i++) {
      talus += `<polygon points="${(15 + rnd() * (W - 30)).toFixed(1)},${(GY + 10 + rnd() * 40).toFixed(1)} ${(25 + rnd() * (W - 40)).toFixed(1)},${(GY + 16 + rnd() * 40).toFixed(1)} ${(20 + rnd() * (W - 35)).toFixed(1)},${(GY + 22 + rnd() * 40).toFixed(1)}" fill="#4a3a30" opacity="${(.18 + rnd() * .28).toFixed(2)}"/>`;
    }

    // walls — face height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const walls = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7060";
      const wh = 30 + f * 95;
      const ww = 10 + f * 18;
      const browY = GY - wh;
      // wall face — vertical strata
      const face = `<path d="M ${cx - ww / 2} ${GY} L ${cx - ww * .42} ${browY} L ${cx + ww * .42} ${browY} L ${cx + ww / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #201818)"/>`;
      // brow edge — flat cap catching light
      const brow = `<rect x="${cx - ww * .42}" y="${browY - 2}" width="${ww * .84}" height="3" rx="1" fill="${hot ? "color-mix(in srgb, var(--red) 50%, #e0c8a0)" : "#e0c8a0"}" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      // vertical strata
      const strata = `<line x1="${cx - ww * .35}" y1="${GY - wh * .2}" x2="${cx - ww * .35}" y2="${GY - wh * .75}" stroke="#3a2a24" stroke-width=".7" opacity=".35"/>
        <line x1="${cx + ww * .3}" y1="${GY - wh * .15}" x2="${cx + ww * .3}" y2="${GY - wh * .7}" stroke="#3a2a24" stroke-width=".7" opacity=".35"/>`;
      // hot brow fire
      const fire = hot ? `<path d="M ${cx - ww * .3} ${browY - 2} Q ${cx - ww * .15} ${browY - 10} ${cx} ${browY - 4} T ${cx + ww * .3} ${browY - 2}" fill="var(--red)" opacity=".6">
        <animate attributeName="opacity" values=".6;.2;.6" dur="1.4s" repeatCount="indefinite"/></path>` : "";
      return `<g class="es-wall${hot ? " hot" : ""}">
        ${face}${brow}${strata}${fire}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="es-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="es-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // rock doves — sessions on the updraft
    const doves = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 10 - (s.tps || 0) / 15);
      const y = GY - 25 - (i % 3) * 16;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#9a8a7a");
      return `<g class="es-dove${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-22} ${y} Q ${W * .35} ${y - 25} ${W * .65} ${y + 10} T ${W + 22} ${y - 15}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .6}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <ellipse cx="${-size * .6}" cy="${-size * .3}" rx="${size * .25}" ry="${size * .15}" fill="${col}"/>
        <line x1="${-size * 1.1}" y1="0" x2="${-size * 1.8}" y2="${-size * .7}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * 1.1}" y1="0" x2="${size * 1.8}" y2="${-size * .7}" stroke="${col}" stroke-width=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="es-wrap">
        <div class="es-head"><b>ESCARP</b><span>断崖=配额窗 壁高=用量 岩鸽=会话${hotN ? " · " + hotN + " 着眉" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#es-sky)" rx="10"/>
          ${sky}${shaft}${talus}${walls}${doves}
          <g class="es-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="es-k">${fmt(k.tokens)} · ${sessions.length} 岩鸽</text>
            <text x="22" y="45" class="es-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "断崖", eyebrow: "ESCARP", render };
})();
