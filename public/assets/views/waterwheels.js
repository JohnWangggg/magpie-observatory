/* ------------------------------------------------------------------ waterwheels
 * Waterwheels — a row of mill wheels on a river: every quota
 * window is a waterwheel whose rim size = used % (≥85% the
 * hub burns amber); sessions are fish leaping in the millrace.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "waterwheels";
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

    // river sky
    const sky = `<defs><linearGradient id="ww-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8f0e8"/><stop offset="100%" stop-color="#f8f8e8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ww-s)" rx="10"/>`;
    // river
    const river = `<rect x="0" y="${GY - 15}" width="${W}" height="40" fill="color-mix(in srgb, #6aa8b8 60%, var(--card-2))"/>`;
    // ripples
    let ripples = "";
    for (let i = 0; i < 8; i++) {
      ripples += `<path d="M ${(rnd() * W).toFixed(1)} ${(GY - 5 + rnd() * 25).toFixed(1)} Q ${(rnd() * W).toFixed(1)} ${(GY - 3 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)} ${(GY - 5 + rnd() * 25).toFixed(1)}" stroke="#c0e0e8" stroke-width=".8" fill="none" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }
    // bank
    const bank = `<path d="M 0 ${GY + 25} L 0 ${GY} L 60 ${GY - 12} L 130 ${GY - 20} L 200 ${GY - 15} L 270 ${GY - 22} L 340 ${GY - 18} L 400 ${GY - 15} L 400 ${GY + 25} Z" fill="color-mix(in srgb, #6a8a68 60%, var(--card-2))"/>`;

    // waterwheels — rim size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const wheels = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = GY - 25;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7858";
      const r = 10 + f * 32;
      // wheel frame
      const frame = `<line x1="${cx - 6}" y1="${GY}" x2="${cx}" y2="${cy}" stroke="${col}" stroke-width="2.5" opacity=".7"/>
        <line x1="${cx + 6}" y1="${GY}" x2="${cx}" y2="${cy}" stroke="${col}" stroke-width="2.5" opacity=".7"/>`;
      // wheel rim
      const rim = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="color-mix(in srgb, ${col} 65%, #6a6858)" stroke-width="2.5"/>`;
      // spokes — 8
      let spokes = "";
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4;
        const x2 = cx + Math.cos(a) * (r - 2);
        const y2 = cy + Math.sin(a) * (r - 2);
        spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="1" opacity=".5"/>`;
      }
      // paddles — small blocks on the rim
      let paddles = "";
      for (let j = 0; j < 8; j++) {
        const a = j * Math.PI / 4;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        paddles += `<rect x="${(px - 4).toFixed(1)}" y="${(py - 2).toFixed(1)}" width="8" height="4" rx="1" fill="color-mix(in srgb, ${col} 70%, #5a5848)" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
      }
      // hub
      const hub = `<circle cx="${cx}" cy="${cy}" r="${(r * .15).toFixed(1)}" fill="${hot ? "var(--amber)" : "color-mix(in srgb, " + col + " 70%, #3a3830)"}"/>`;
      // hot glow
      const glow = hot ? `<circle cx="${cx}" cy="${cy}" r="${(r + 4).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1.5" opacity=".5" stroke-dasharray="3 3">
        <animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};360 ${cx} ${cy}" dur="${Math.max(3, 10 - (f * 8)).toFixed(1)}s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="ww-wheel${hot ? " hot" : ""}">
        ${frame}${rim}${spokes}${paddles}${hub}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 30}" class="ww-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 41}" class="ww-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fish — leaping in the millrace
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = GY + 5 + (i % 3) * 8;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0b060");
      const startX = W / 2 + (rnd() - .5) * 100;
      const jumpH = 15 + rnd() * 15;
      return `<g class="ww-fish${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${startX.toFixed(1)} ${y.toFixed(1)} Q ${(startX + 40).toFixed(1)} ${(y - jumpH).toFixed(1)} ${(startX + 80).toFixed(1)} ${y.toFixed(1)}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .35}" fill="${col}"/>
        <path d="M ${-size * .9} 0 L ${-size * 1.5} ${-size * .35} L ${-size * 1.5} ${size * .35} Z" fill="${col}"/>
        <path d="M ${size * .4} ${-size * .2} L ${size * .9} ${-size * .5}" stroke="${col}" stroke-width=".6" fill="none"/>
        <circle cx="${size * .6}" cy="${-size * .05}" r="${size * .08}" fill="var(--card-2)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ww-wrap">
        <div class="ww-head"><b>WATERWHEELS</b><span>水车=配额窗 直径=用量 游鱼=会话${hotN ? " · " + hotN + " 燃毂" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${river}${ripples}${bank}${wheels}${fish}
          <g class="ww-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ww-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="45" class="ww-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水车群", eyebrow: "WATERWHEELS", render };
})();
