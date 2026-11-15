/* -------------------------------------------------------------------- pottery
 * Pottery view — a row of kick wheels, one per provider.
 * Thrown pots drying on the bat = tokens; a potter centering
 * for live sessions; a collapsed wall marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pottery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="po-empty">暂无陶坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const clay = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c09060" : "#987050";
      const wheelW = seg * .45;
      const wheelY = floorY - 28;
      // the wheel — a head on a shaft over the kick flywheel
      g += `<ellipse cx="${x}" cy="${wheelY}" rx="${wheelW * .22}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x}" y1="${wheelY + 4}" x2="${x}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<ellipse cx="${x}" cy="${floorY - 6}" rx="${wheelW * .16}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // the pot being thrown — a vessel on the wheel head
      g += `<path d="M ${x - wheelW * .1} ${wheelY - 2} q -2 -12 4 -14 l ${wheelW * .12} 0 q 6 2 4 14 z" fill="${clay}" stroke="${r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // throwing lines — rings on the pot wall
      g += `<path d="M ${x - wheelW * .07} ${wheelY - 8} q ${wheelW * .07} 2 ${wheelW * .14} 0" stroke="${r.col}" stroke-width=".6" fill="none" opacity=".6"/>`;
      // thrown pots drying on the bat — a shelf stack, count by tokens
      const pots = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pots; p++) {
        const px = x + wheelW * .3 + p * 11;
        g += `<path d="M ${px} ${floorY - 4} l 1 -7 l 6 0 l 1 7 z" fill="${p === 0 && r.err ? "var(--red)" : clay}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // potter centering for live sessions — figure leaning over the wheel
      if (r.live) {
        g += `<g class="po-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - wheelW * .4} ${wheelY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="15" y2="9" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // collapsed wall — a slumped rim on errors
      if (r.err) g += `<path d="M ${x - wheelW * .06} ${wheelY - 14} q ${wheelW * .08} 5 ${wheelW * .16} 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="po-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="po-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "陶坊", eyebrow: "PROVIDER POTTERY", render };
})();
