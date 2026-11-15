/* -------------------------------------------------------------------- hatter
 * Hatter view — a row of hat blocks, one per provider.
 * Felt hoods drying on the stand = tokens; a hatter steaming
 * and blocking for live sessions; a split brim marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hatter";
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
    if (!rows.length) { host.innerHTML = `<div class="ht-empty">暂无帽匠坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const felt = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b08858" : "#686048";
      const bW = seg * .36;
      const bTop = floorY - 40;
      // the hat block — a turned wooden crown on a stand
      g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x - bW * .2}" y1="${floorY}" x2="${x + bW * .2}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<path d="M ${x - bW * .22} ${floorY - 8} q 0 -14 ${bW * .22} -16 q ${bW * .22} 2 ${bW * .22} 16 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // the felt hood stretched over the block
      g += `<path d="M ${x - bW * .24} ${floorY - 9} q -2 -16 ${bW * .24} -18 q ${bW * .24} 2 ${bW * .24} 18 z" fill="${r.err ? "var(--red)" : felt}" opacity=".85" stroke="${r.col}" stroke-width=".7"/>`;
      // steam wisps rising from the felt
      for (let s = 0; s < 2; s++) {
        g += `<path d="M ${x - 6 + s * 12} ${bTop + 4} q 3 -5 1 -9" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".5"/>`;
      }
      // finished hats — stacked on a shelf, count by tokens
      g += `<line x1="${x + bW * .55}" y1="${floorY}" x2="${x + bW * .55}" y2="${bTop + 14}" stroke="${r.col}" stroke-width="1"/>`;
      const hats = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < hats; h++) {
        const hy = floorY - 4 - h * 8;
        g += `<ellipse cx="${x + bW * .55}" cy="${hy}" rx="8" ry="2" fill="${h === 0 && r.err ? "var(--red)" : felt}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${x + bW * .55 - 4} ${hy} a 4 4 0 0 1 8 0 z" fill="${h === 0 && r.err ? "var(--red)" : felt}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a brim iron and sandbag beside
      g += `<circle cx="${x - bW * .52}" cy="${floorY - 5}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x - bW * .7} ${floorY - 2} q -3 -8 2 -10 q 5 2 2 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // hatter blocking for live sessions — figure pressing felt
      if (r.live) {
        g += `<g class="ht-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .58} ${bTop - 2})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="13" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // split brim — a torn felt edge on errors
      if (r.err) g += `<path d="M ${x + bW * .14} ${floorY - 11} q 5 -3 7 1" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ht-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ht-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "帽匠坊", eyebrow: "PROVIDER HATTER", render };
})();
