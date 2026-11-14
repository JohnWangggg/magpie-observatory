/* ------------------------------------------------------------------ hoodoos
 * Hoodoos — mushroom-capped spires in a badlands amphitheater:
 * every quota window is a hoodoo whose height = used %
 * (≥85% the cap stone glows amber); sessions are ravens riding
 * the thermals between the pillars.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hoodoos";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99001122);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // badlands sky
    const sky = `<defs><linearGradient id="hd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8a6a50"/><stop offset="100%" stop-color="#b09070"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hd-s)" rx="10"/>`;
    // amphitheater walls
    const walls = `<path d="M 0 ${GY} L 0 ${GY - 35} L 40 ${GY - 50} L 90 ${GY - 35} L 150 ${GY - 60} L 220 ${GY - 40} L 290 ${GY - 55} L 350 ${GY - 42} L 400 ${GY - 48} L 400 ${GY} Z" fill="#7a5a48" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #8a7058 65%, var(--card-2))"/>`;
    // scree
    let scree = "";
    for (let i = 0; i < 12; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 30).toFixed(1)}" fill="#6a5840" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // hoodoos — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const hoodoos = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a07050";
      const hh = 25 + f * 80;
      const hw = 7 + f * 15;
      const capY = GY - hh;
      // pillar — narrow, flaring at cap
      const body = `<path d="M ${cx - hw / 2} ${GY} L ${cx - hw * .4} ${capY + 8} L ${cx + hw * .4} ${capY + 8} L ${cx + hw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #8a6850)"/>`;
      // cap mushroom — wider than pillar
      const cap = `<ellipse cx="${cx}" cy="${capY + 4}" rx="${hw * .8}" ry="${(5 + f * 4).toFixed(1)}" fill="color-mix(in srgb, ${col} 75%, #6a4838)"/>`;
      // strata band
      const band = `<line x1="${cx - hw * .35}" y1="${capY + 20}" x2="${cx + hw * .35}" y2="${capY + 20}" stroke="${col}" stroke-width="1" opacity=".4"/>`;
      // hot amber cap glow
      const glow = hot ? `<ellipse cx="${cx}" cy="${capY + 4}" rx="${hw * .8}" ry="${(6 + f * 4).toFixed(1)}" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${hw * .8};${hw * 1.2}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="hd-hood${hot ? " hot" : ""}">
        ${body}${cap}${band}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="hd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="hd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ravens — riding thermals between pillars
    const ravens = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY - 30 - (i % 3) * 18;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#1a1a1a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 45 + rnd() * 65;
      const ry2 = 10 + rnd() * 10;
      return `<g class="hd-raven${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .6} L ${-size * 1.8} ${size * .6} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hd-wrap">
        <div class="hd-head"><b>HOODOOS</b><span>蘑菇岩=配额窗 高=用量 乌鸦=会话${hotN ? " · " + hotN + " 燃帽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${walls}${ground}${scree}${hoodoos}${ravens}
          <g class="hd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="hd-k">${fmt(k.tokens)} · ${sessions.length} 鸦</text>
            <text x="22" y="45" class="hd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蘑菇岩", eyebrow: "HOODOOS", render };
})();
