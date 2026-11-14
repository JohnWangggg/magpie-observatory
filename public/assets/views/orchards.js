/* ------------------------------------------------------------------ orchards
 * Orchards — apple trees in tidy rows: every quota window is
 * a tree whose canopy size = used % (≥85% the blossom burns
 * amber); sessions are bees drifting between the blooms.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "orchards";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55446677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // spring sky
    const sky = `<defs><linearGradient id="oh-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e0f0d8"/><stop offset="100%" stop-color="#f0f8e8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#oh-s)" rx="10"/>`;
    // hill
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 30} L 60 ${GY - 40} L 130 ${GY - 25} L 200 ${GY - 45} L 270 ${GY - 30} L 340 ${GY - 40} L 400 ${GY - 35} L 400 ${GY} Z" fill="#c8d8a8" opacity=".25"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #a8c888 55%, var(--card-2))"/>`;
    // grass
    let grass = "";
    for (let i = 0; i < 15; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + 3 + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + 5 + rnd() * 20).toFixed(1)}" stroke="#88a868" stroke-width=".7" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // orchard trees — canopy size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const trees = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#789848";
      const th = 25 + f * 55;
      const cw = 10 + f * 18;
      const topY = GY - th;
      // trunk
      const trunk = `<path d="M ${cx} ${GY} L ${cx - 2} ${topY + 12} L ${cx + 2} ${topY + 12} Z" fill="color-mix(in srgb, ${col} 50%, #6a5a48)"/>`;
      // canopy — leaf blobs
      const leafN = Math.round(2 + f * 6);
      let canopy = "";
      for (let l = 0; l < leafN; l++) {
        const lx = cx + (rnd() - .5) * cw;
        const ly = topY + (rnd() - .5) * cw * .7;
        const lr = 4 + rnd() * 6;
        canopy += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${lr.toFixed(1)}" fill="color-mix(in srgb, ${col} ${50 + f * 25}%, #88a858)" opacity="${(.6 + f * .25).toFixed(2)}"/>`;
      }
      // apples
      let apples = "";
      const appleN = Math.round(1 + f * 4);
      for (let a = 0; a < appleN; a++) {
        const ax = cx + (rnd() - .5) * cw * .8;
        const ay = topY + (rnd() - .5) * cw * .5;
        apples += `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.5" fill="#c04030" opacity=".8"/>`;
      }
      // blossom on top
      const blossom = hot ? `<circle cx="${cx}" cy="${topY - cw * .2}" r="${(3 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".6">
        <animate attributeName="r" values="${(3 + f * 3).toFixed(1)};${(6 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.15" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="oh-tree${hot ? " hot" : ""}">
        ${trunk}${canopy}${apples}${blossom}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="oh-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="oh-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // bees — drifting between the blooms
    const bees = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cy2 = GY - (25 + (row ? Math.min(1, row.used / 100) : 0) * 55) - 10;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length));
      const rx2 = 18 + rnd() * 18;
      const ry2 = 8 + rnd() * 8;
      const size = 2 + Math.min(1.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8b030");
      return `<g class="oh-bee${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${-size * .3} 0 L ${-size * .7} ${-size * .5} L ${-size * .7} ${size * .5} Z" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .1} L ${size * .9} ${-size * .5}" stroke="${col}" stroke-width=".4" fill="none"/>
        <ellipse cx="${size * .1}" cy="${-size * .3}" rx="${size * .35}" ry="${size * .15}" fill="#e8e8d8" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="oh-wrap">
        <div class="oh-head"><b>ORCHARDS</b><span>果树=配额窗 冠幅=用量 蜜蜂=会话${hotN ? " · " + hotN + " 燃花" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${grass}${trees}${bees}
          <g class="oh-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="oh-k">${fmt(k.tokens)} · ${sessions.length} 蜂</text>
            <text x="22" y="45" class="oh-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "果园", eyebrow: "ORCHARDS", render };
})();
