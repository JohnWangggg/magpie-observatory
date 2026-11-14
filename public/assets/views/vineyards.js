/* ------------------------------------------------------------------ vineyards
 * Vineyards — trellised grape rows on a hillside: every quota
 * window is a vineyard row whose vine height = used % (≥85%
 * the top wire burns amber); sessions are sparrows flitting
 * along the wires.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vineyards";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44335566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // autumn sky
    const sky = `<defs><linearGradient id="vr-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f0d8b8"/><stop offset="100%" stop-color="#f8e8d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vr-s)" rx="10"/>`;
    // hillside
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 30} L 60 ${GY - 45} L 130 ${GY - 28} L 200 ${GY - 50} L 270 ${GY - 35} L 340 ${GY - 48} L 400 ${GY - 42} L 400 ${GY} Z" fill="#c8b088" opacity=".25"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b8a068 55%, var(--card-2))"/>`;

    // vineyard rows — vine height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const rows = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a9848";
      const vh = 15 + f * 75;
      const vw = 14 + f * 20;
      const topY = GY - vh;
      // trellis posts
      const post1 = `<line x1="${cx - vw * .35}" y1="${GY}" x2="${cx - vw * .35}" y2="${topY - 5}" stroke="${col}" stroke-width="1.5" opacity=".6"/>`;
      const post2 = `<line x1="${cx + vw * .35}" y1="${GY}" x2="${cx + vw * .35}" y2="${topY - 5}" stroke="${col}" stroke-width="1.5" opacity=".6"/>`;
      // wires
      const wires = `<line x1="${cx - vw * .5}" y1="${topY}" x2="${cx + vw * .5}" y2="${topY}" stroke="${col}" stroke-width=".6" opacity=".5"/>
        <line x1="${cx - vw * .5}" y1="${topY + vh * .4}" x2="${cx + vw * .5}" y2="${topY + vh * .4}" stroke="${col}" stroke-width=".5" opacity=".45"/>`;
      // vine canopy — leaf density = used %
      const leafN = Math.round(3 + f * 7);
      let leaves = "";
      for (let l = 0; l < leafN; l++) {
        const lx = cx + (rnd() - .5) * vw * .8;
        const ly = topY + vh * (.15 + rnd() * .5);
        const lr = 2.5 + rnd() * 3;
        leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr}" ry="${lr * .6}" fill="color-mix(in srgb, ${col} ${40 + f * 35}%, #788848)" opacity="${(.5 + f * .3).toFixed(2)}"/>`;
      }
      // grape bunches
      let grapes = "";
      const grapeN = Math.round(1 + f * 3);
      for (let g = 0; g < grapeN; g++) {
        const gx = cx + (rnd() - .5) * vw * .5;
        const gy = topY + vh * (.5 + rnd() * .3);
        grapes += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="1.5" fill="#6a5a98" opacity=".8"/>
          <circle cx="${(gx + 3).toFixed(1)}" cy="${gy.toFixed(1)}" r="1.5" fill="#7a6aa8" opacity=".75"/>
          <circle cx="${(gx + 1.5).toFixed(1)}" cy="${(gy + 2.5).toFixed(1)}" r="1.5" fill="#6a5a98" opacity=".7"/>`;
      }
      // hot amber wire glow
      const glow = hot ? `<line x1="${cx - vw * .5}" y1="${topY - 2}" x2="${cx + vw * .5}" y2="${topY - 2}" stroke="var(--amber)" stroke-width="2" opacity=".6">
        <animate attributeName="opacity" values=".6;.2;.6" dur="1.8s" repeatCount="indefinite"/></line>` : "";
      return `<g class="vr-row${hot ? " hot" : ""}">
        ${post1}${post2}${wires}${leaves}${grapes}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="vr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="vr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sparrows — flitting along the wires
    const sparrows = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const y = GY - (15 + (row ? Math.min(1, row.used / 100) : 0) * 75) - 8;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#987848");
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const rw2 = 15 + rnd() * 15;
      const ry2 = 4 + rnd() * 4;
      return `<g class="vr-sparrow${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rw2).toFixed(1)} ${y} A ${rw2} ${ry2} 0 0 0 ${(cx2 + rw2).toFixed(1)} ${y} A ${rw2} ${ry2} 0 0 0 ${(cx2 - rw2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .35}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .15}" r="${size * .25}" fill="${col}"/>
        <path d="M ${-size * .7} 0 L ${-size * 1.3} ${-size * .4} L ${-size * 1.3} ${size * .4} Z" fill="${col}"/>
        <line x1="0" y1="0" x2="0" y2="${size * .7}" stroke="${col}" stroke-width=".3" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vr-wrap">
        <div class="vr-head"><b>VINEYARDS</b><span>葡园=配额窗 架高=用量 麻雀=会话${hotN ? " · " + hotN + " 燃线" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${rows}${sparrows}
          <g class="vr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="vr-k">${fmt(k.tokens)} · ${sessions.length} 雀</text>
            <text x="22" y="45" class="vr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "葡萄园", eyebrow: "VINEYARDS", render };
})();
