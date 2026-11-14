/* ------------------------------------------------------------------ lighthouses
 * Lighthouses — a squadron of beacon towers on a dark coast:
 * every quota window is a lighthouse whose light-beam sweep =
 * used % (≥85% the lamp flares amber); sessions are gulls riding
 * the beam glow.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lighthouses";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;

    // night sky
    const sky = `<defs><linearGradient id="li-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a1218"/><stop offset="100%" stop-color="#1a2830"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#li-s)" rx="10"/>`;
    // stars
    let stars = "";
    for (let i = 0; i < 15; i++) {
      stars += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(15 + rnd() * 60).toFixed(1)}" r="${(rnd() * .8 + .3).toFixed(1)}" fill="#c0c8d0" opacity="${(.1 + rnd() * .15).toFixed(2)}"/>`;
    }
    // sea
    const sea = `<rect x="0" y="${GY - 10}" width="${W}" height="15" fill="color-mix(in srgb, #1a3038 75%, var(--card-2))"/>`;
    // rocky coast
    const coast = `<path d="M 0 ${GY} L 0 ${GY - 20} L 60 ${GY - 35} L 130 ${GY - 20} L 200 ${GY - 40} L 270 ${GY - 25} L 340 ${GY - 35} L 400 ${GY - 28} L 400 ${GY} Z" fill="#2a3028" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #2a3238 70%, var(--card-2))"/>`;

    // lighthouses — beam sweep = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const lights = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d0c8a8";
      const lh = 25 + f * 85;
      const lw = 10 + f * 16;
      const topY = GY - lh;
      // tower body
      const body = `<rect x="${cx - lw / 2}" y="${topY + 10}" width="${lw}" height="${lh - 10}" fill="color-mix(in srgb, ${col} 45%, #3a4048)"/>`;
      // stripes
      const stripe1 = `<rect x="${cx - lw * .4}" y="${topY + lh * .25}" width="${lw * .8}" height="4" fill="#c84030" opacity=".6"/>`;
      const stripe2 = `<rect x="${cx - lw * .4}" y="${topY + lh * .5}" width="${lw * .8}" height="4" fill="#c84030" opacity=".55"/>`;
      // lamp housing
      const lamp = `<rect x="${cx - lw * .4}" y="${topY - 3}" width="${lw * .8}" height="8" rx="2" fill="${hot ? "var(--amber)" : col}"/>`;
      // light beam — sweep = used %
      const bl = 25 + f * 65;
      const beam = `<path d="M ${cx} ${topY + 1} L ${cx + bl} ${topY - 12} L ${cx + bl} ${topY + 10} Z" fill="${hot ? "var(--amber)" : col}" opacity="${(.1 + f * .15).toFixed(2)}">
        <animate attributeName="opacity" values="${(.1 + f * .15).toFixed(2)};${(.05 + f * .08).toFixed(2)};${(.1 + f * .15).toFixed(2)}" dur="4s" repeatCount="indefinite"/></path>`;
      // hot flare
      const flare = hot ? `<circle cx="${cx}" cy="${topY}" r="${(4 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(4 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="li-light${hot ? " hot" : ""}">
        ${body}${stripe1}${stripe2}${lamp}${beam}${flare}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="li-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="li-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // gulls — riding the beam glow
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = GY - 25 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c0c8d0");
      const cx2 = W / 2 + (rnd() - .5) * 60;
      const cy2 = y;
      const rx2 = 45 + rnd() * 55;
      const ry2 = 10 + rnd() * 10;
      return `<g class="li-gull${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .7} L ${-size * 1.8} ${size * .7} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="li-wrap">
        <div class="li-head"><b>LIGHTHOUSES</b><span>灯塔=配额窗 光程=用量 海鸥=会话${hotN ? " · " + hotN + " 燃灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${stars}${sea}${coast}${ground}${lights}${gulls}
          <g class="li-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="li-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="li-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯塔群", eyebrow: "LIGHTHOUSES", render };
})();
