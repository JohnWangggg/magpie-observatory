/* ------------------------------------------------------------------ japanner
 * Maki-e view — a row of maki-e benches, one per provider.
 * Coats of lacquer built on the piece = tokens; a japanner
 * polishing a tray for live sessions; a blistered coat marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "japanner";
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
    if (!rows.length) { host.innerHTML = `<div class="jpn-empty">暂无莳绘坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const lac = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c03828" : "#582820";
      const bW = seg * .38;
      const bTop = floorY - 30;
      // the bench — low japanning table
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .42}" y1="${bTop + 5}" x2="${x - bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + bW * .42}" y1="${bTop + 5}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      // the piece on the bench — a tray being lacquered, coats by tokens
      g += `<ellipse cx="${x - bW * .1}" cy="${bTop - 3}" rx="${bW * .3}" ry="6" fill="${lac}" stroke="${r.col}" stroke-width="1"/>`;
      const coats = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < coats; c++) {
        g += `<path d="M ${x - bW * .1 - bW * .26 + c * 3} ${bTop - 6} q ${bW * .3 - c * 3} -6 ${(bW * .3 - c * 3) * 2} 0" fill="none" stroke="${c === 0 && r.err ? "var(--red)" : lac}" stroke-width="1" opacity="${.5 + c * .1}"/>`;
      }
      // gold maki-e dust sprinkled on the wet coat
      for (let d = 0; d < 4; d++) {
        g += `<circle cx="${x - bW * .2 + d * bW * .1}" cy="${bTop - 5 - (d % 2)}" r=".7" fill="#e0c050"/>`;
      }
      // a lacquer pot with its brush rest beside
      g += `<path d="M ${x + bW * .32} ${bTop - 6} a 4 4 0 0 1 8 0 l -1 4 h -6 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .36}" y1="${bTop - 7}" x2="${x + bW * .44}" y2="${bTop - 12}" stroke="${r.col}" stroke-width="1"/>`;
      // finished ware — a cabinet of glossy boxes, count by tokens
      g += `<line x1="${x + bW * .62}" y1="${floorY}" x2="${x + bW * .62}" y2="${floorY - 18}" stroke="${r.col}" stroke-width="1"/>`;
      const boxes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < boxes; b++) {
        g += `<rect x="${x + bW * .54}" y="${floorY - 8 - b * 6}" width="${bW * .2}" height="6" rx="1" fill="${b === 0 && r.err ? "var(--red)" : lac}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${x + bW * .54 + 2}" y1="${floorY - 6 - b * 6}" x2="${x + bW * .7 - 2}" y2="${floorY - 6 - b * 6}" stroke="#e0c050" stroke-width=".5" opacity=".8"/>`;
      }
      // drying cabinet (muro) behind — a slatted box
      g += `<rect x="${x - bW * .68}" y="${floorY - 18}" width="10" height="14" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .68}" y1="${floorY - 13}" x2="${x - bW * .68 + 10}" y2="${floorY - 13}" stroke="${r.col}" stroke-width=".5"/>`;
      // japanner polishing for live sessions — figure rubbing the tray
      if (r.live) {
        g += `<g class="jpn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .5} ${bTop - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="12" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // blistered coat — bubbled lacquer on errors
      if (r.err) {
        g += `<circle cx="${x - bW * .05}" cy="${bTop - 5}" r="1.6" fill="var(--red)"/>`;
        g += `<circle cx="${x - bW * .12}" cy="${bTop - 6}" r="1.1" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="jpn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="jpn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "莳绘坊", eyebrow: "PROVIDER MAKI-E", render };
})();
