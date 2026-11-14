/* ------------------------------------------------------------------ estuary
 * Estuary — a tidal river mouth at low water: every quota
 * window is a sand spit whose length = used % (≥85% the tip
 * burns amber); sessions are kingfishers diving for fish.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "estuary";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // muddy sky
    const sky = `<defs><linearGradient id="ea-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b0a890"/><stop offset="100%" stop-color="#8a9088"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ea-s)" rx="10"/>`;
    // reed beds
    let reeds = "";
    for (let i = 0; i < 10; i++) {
      const rx = 20 + i * 40;
      reeds += `<line x1="${rx}" y1="${GY}" x2="${rx - 4}" y2="${GY - 25 - rnd() * 15}" stroke="#5a6a4a" stroke-width="1.5" opacity=".4"/>
        <line x1="${rx}" y1="${GY}" x2="${rx + 4}" y2="${GY - 22 - rnd() * 15}" stroke="#5a6a4a" stroke-width="1.2" opacity=".35"/>`;
    }
    // water
    const water = `<rect x="0" y="${GY - 5}" width="${W}" height="${H - GY + 5}" fill="color-mix(in srgb, #4a6a6a 75%, var(--card-2))"/>`;
    // mudflats
    const mud = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #6a5a48 65%, var(--card-2))"/>`;
    // water ripples
    let ripples = "";
    for (let i = 0; i < 10; i++) {
      ripples += `<path d="M ${i * 45} ${GY - 3} Q ${i * 45 + 20} ${GY - 7} ${i * 45 + 40} ${GY - 3}" stroke="#5a7a7a" stroke-width=".8" fill="none" opacity=".3"/>`;
    }

    // sand spits — length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const spits = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7a5a";
      const sl = 15 + f * 40;
      const sw = 6 + f * 14;
      // spit — curved sand finger pointing seaward
      const body = `<path d="M ${cx - sw / 2} ${GY} Q ${cx - sw * .3} ${GY - sl * .6} ${cx} ${GY - sl} Q ${cx + sw * .3} ${GY - sl * .6} ${cx + sw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 60%, #8a7a60)"/>`;
      // water line at base
      const line = `<line x1="${cx - sw * .5}" y1="${GY}" x2="${cx + sw * .5}" y2="${GY}" stroke="#5a7a7a" stroke-width="1" opacity=".4"/>`;
      // hot amber tip
      const glow = hot ? `<ellipse cx="${cx}" cy="${GY - sl}" rx="${sw * .4}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${sw * .4};${sw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.2" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ea-spit${hot ? " hot" : ""}">
        ${body}${line}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ea-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ea-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // kingfishers — diving for fish
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(3, 8 - (s.tps || 0) / 15);
      const y = GY - 15 - (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#2a5a7a");
      return `<g class="ea-bird${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 15).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.7} ${-size * .5} L ${-size * 1.7} ${size * .5} Z" fill="${col}"/>
        <circle cx="${size * 1.1}" cy="${-size * .15}" r="${size * .12}" fill="${col}" opacity=".8"/>
        <path d="M ${size * .8} ${size * .2} L ${size * 1.4} ${size * .8}" stroke="${col}" stroke-width=".6" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ea-wrap">
        <div class="ea-head"><b>ESTUARY</b><span>沙嘴=配额窗 长=用量 翠鸟=会话${hotN ? " · " + hotN + " 燃嘴" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${water}${mud}${ripples}${reeds}${spits}${birds}
          <g class="ea-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ea-k">${fmt(k.tokens)} · ${sessions.length} 鸟</text>
            <text x="22" y="45" class="ea-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "河口", eyebrow: "ESTUARY", render };
})();
