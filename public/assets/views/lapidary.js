/* ---------------------------------------------------------------- lapidary
 * Lapidary view — a row of cutting laps, one per provider. Stone
 * on the dop = tokens; a dop arm lowered to the lap for live
 * sessions; a chipped girdle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lapidary";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lp-empty">暂无磨盘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const lapR = 16;
      const lapY = benchY - lapR - 8;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a0c8e0" : "#7098b8";
      // lap disc — horizontal, seen from above
      g += `<circle cx="${x}" cy="${lapY}" r="${lapR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<circle cx="${x}" cy="${lapY}" r="${lapR * .6}" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      g += `<circle cx="${x}" cy="${lapY}" r="${lapR * .3}" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      // rotation marker
      g += `<line x1="${x}" y1="${lapY - lapR}" x2="${x}" y2="${lapY + lapR}" stroke="${r.col}" stroke-width="1" opacity=".3"/>`;
      g += `<line x1="${x - lapR}" y1="${lapY}" x2="${x + lapR}" y2="${lapY}" stroke="${r.col}" stroke-width="1" opacity=".3"/>`;
      // stone on dop — size by tokens, facets by burn
      const stoneR = 4 + (r.tok / maxTok) * 5;
      const stoneY = lapY - lapR - 4;
      const facets = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let f = 0; f < facets; f++) {
        const a = (f / facets) * Math.PI * 2;
        const fx = x + Math.cos(a) * stoneR * .7;
        const fy = stoneY + Math.sin(a) * stoneR * .4;
        g += `<path d="M ${x} ${stoneY} L ${fx.toFixed(1)} ${fy.toFixed(1)}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      }
      g += `<circle cx="${x}" cy="${stoneY}" r="${stoneR.toFixed(1)}" fill="${tint}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="2 2"' : ""}/>`;
      // dop arm — lowered to lap for live sessions
      const armLift = r.live ? -8 : -20;
      g += `<g class="lp-dop" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${stoneY + armLift})">
        <line x1="0" y1="0" x2="0" y2="-14" stroke="${r.col}" stroke-width="1.6"/>
        <rect x="-3" y="-18" width="6" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
      </g>`;
      // chipped girdle on errors
      if (r.err) g += `<path d="M ${x + stoneR - 2} ${stoneY - 2} l 3 3 l -3 3" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="lp-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "宝石坊", eyebrow: "PROVIDER LAPIDARY", render };
})();
