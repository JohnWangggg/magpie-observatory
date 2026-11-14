/* ------------------------------------------------------------------ fords
 * Fords — shallow river crossings on a farm track: every
 * quota window is a flat stone whose width = used % (≥85%
 * the marker post burns amber); sessions are cattle wading
 * across.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fords";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11993355);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 195, GY = 252;

    // farm sky
    const sky = `<defs><linearGradient id="fd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8dcc0"/><stop offset="100%" stop-color="#e8ecd0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fd-s)" rx="10"/>`;
    // far bank — green
    const farBank = `<path d="M 0 ${WY} L 0 ${WY - 30} Q 100 ${WY - 45} 200 ${WY - 35} Q 300 ${WY - 48} 400 ${WY - 38} L 400 ${WY} Z" fill="color-mix(in srgb, #68a058 60%, var(--card-2))"/>`;
    // water — shallow ford
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #68a8b0 55%, var(--card-2))"/>`;
    // ripples over the shallows
    let ripples = "";
    for (let i = 0; i < 8; i++) {
      ripples += `<path d="M ${(rnd() * W).toFixed(1)} ${(WY + 8 + rnd() * 45).toFixed(1)} q 15 ${(rnd() * 3 - 1).toFixed(1)} 30 ${(rnd() * 3 - 1).toFixed(1)}" stroke="#b0d8e0" stroke-width=".7" fill="none" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // near bank — muddy track
    const nearBank = `<path d="M 0 ${GY} L 0 ${GY - 15} Q 100 ${GY - 25} 200 ${GY - 18} Q 300 ${GY - 28} 400 ${GY - 20} L 400 ${GY} Z" fill="color-mix(in srgb, #988868 60%, var(--card-2))"/>`;
    const track = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #887858 60%, var(--card-2))"/>`;
    // cart ruts
    let ruts = "";
    for (let i = 0; i < 6; i++) {
      ruts += `<line x1="${(i * 70 + 15).toFixed(1)}" y1="${GY + 8}" x2="${(i * 70 + 50).toFixed(1)}" y2="${GY + 12}" stroke="#685840" stroke-width="2" opacity=".3"/>`;
    }

    // ford stones — width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const stones = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = WY + (GY - WY) * .55;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#887870";
      const sw = 12 + f * 28;
      const sh = 4 + f * 8;
      // flat stone
      const stone = `<ellipse cx="${cx}" cy="${cy}" rx="${sw / 2}" ry="${sh}" fill="color-mix(in srgb, ${col} 70%, #786858)"/>`;
      // dry top
      const top = `<ellipse cx="${cx}" cy="${cy - sh * .3}" rx="${sw * .45}" ry="${sh * .6}" fill="color-mix(in srgb, ${col} 85%, #988878)"/>`;
      // water lap around the stone
      const lap = `<ellipse cx="${cx}" cy="${cy + sh * .4}" rx="${sw * .6}" ry="${sh * .3}" fill="none" stroke="#b0d8e0" stroke-width=".8" opacity=".5"/>`;
      // marker post
      const post = `<line x1="${cx + sw * .4}" y1="${cy}" x2="${cx + sw * .4}" y2="${cy - 18}" stroke="#685848" stroke-width="2"/>`;
      // hot amber flag on post
      const flag = `<path d="M ${cx + sw * .4} ${cy - 18} L ${cx + sw * .4 + 8} ${cy - 15} L ${cx + sw * .4} ${cy - 12} Z" fill="${hot ? "var(--amber)" : "#a09888"}"/>`;
      const glow = hot ? `<circle cx="${cx + sw * .4 + 2}" cy="${cy - 15}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="fd-stone${hot ? " hot" : ""}">
        ${lap}${stone}${top}${post}${flag}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="fd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="fd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // cattle — wading across
    const cattle = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 18 - (s.tps || 0) / 11);
      const y = WY + 12 + (i % 3) * 14;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 70000);
      const col = dead ? "var(--red)" : (m.color || "#785838");
      return `<g class="fd-cow${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .7}" fill="${col}"/>
        <circle cx="${size * 1.1}" cy="${-size * .4}" r="${size * .4}" fill="${col}"/>
        <path d="M ${size * .8} ${-size * .6} L ${size * 1.2} ${-size * .9} L ${size * 1.5} ${-size * .5}" stroke="${col}" stroke-width=".8" fill="none"/>
        <path d="M ${size * 1.2} ${-size * .9} L ${size * .9} ${-size * 1.3}" stroke="#c0b0a0" stroke-width=".6" fill="none"/>
        <path d="M ${-size * 1.2} ${size * .3} Q ${-size * 1.8} ${size * .8} ${-size * 1.5} ${size * 1.3}" stroke="${col}" stroke-width=".8" fill="none"/>
        <line x1="${size * .6}" y1="${size * .6}" x2="${size * .6}" y2="${size * 1.4}" stroke="${col}" stroke-width=".7"/>
        <line x1="${-size * .5}" y1="${size * .6}" x2="${-size * .5}" y2="${size * 1.4}" stroke="${col}" stroke-width=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fd-wrap">
        <div class="fd-head"><b>FORDS</b><span>石=配额窗 石宽=用量 牛=会话${hotN ? " · " + hotN + " 燃标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${farBank}${water}${ripples}${nearBank}${track}${ruts}${stones}${cattle}
          <g class="fd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fd-k">${fmt(k.tokens)} · ${sessions.length} 牛</text>
            <text x="22" y="45" class="fd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浅滩", eyebrow: "FORDS", render };
})();
