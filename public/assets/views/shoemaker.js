/* ----------------------------------------------------------------- shoemaker
 * Shoemaker view — a row of last benches, one per provider.
 * Shoes on the last = tokens; a shoemaker stitching
 * a sole for live sessions; a split seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shoemaker";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="smk-empty">暂无鞋匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const benchY = floorY - 12;
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the bench — a low table with legs
      g += `<rect x="${x - bW * .38}" y="${benchY}" width="${bW * .76}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .34}" y1="${benchY + 8}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .34}" y1="${benchY + 8}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      // a last — a foot form on the bench
      g += `<path d="M ${x - bW * .28} ${benchY - 12} q 4 -6 8 -6 q 4 0 4 6 l 0 6 q -8 2 -12 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .24}" y1="${benchY - 12}" x2="${x - bW * .24}" y2="${benchY - 18}" stroke="${r.col}" stroke-width=".7"/>`;
      // shoes on the bench — small lasts with uppers, count by tokens
      const shoes = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < shoes; s++) {
        const sx = x - bW * .18 + s * bW * .12;
        g += `<path d="M ${sx} ${benchY - 8} l 0 -6 q 2 -3 4 0 l 0 6 q -2 2 -4 0 z" fill="${s === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".6"/>`;
        // toe cap
        g += `<path d="M ${sx + 3} ${benchY - 8} q 2 -2 3 0 q -1 2 -3 0 z" fill="${s === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a sole on the bench — a leather sole shape
      g += `<path d="M ${x + bW * .18} ${benchY - 4} q 6 -3 12 0 q -6 3 -12 0 z" fill="${leather}" stroke="${r.col}" stroke-width=".6"/>`;
      // a hammer and awl beside
      g += `<line x1="${x + bW * .32}" y1="${benchY - 8}" x2="${x + bW * .36}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .36}" y1="${benchY - 14}" x2="${x + bW * .4}" y2="${benchY - 10}" stroke="${r.col}" stroke-width=".7"/>`;
      // a heel stack — leather pieces stacked
      for (let h = 0; h < 3; h++) {
        g += `<rect x="${x - bW * .44}" y="${floorY - 6 - h * 4}" width="8" height="4" fill="${leather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a thread ball — a waxed end
      g += `<circle cx="${x + bW * .44}" cy="${benchY - 6}" r="2.4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .44} ${benchY - 6} q 3 -4 6 -2" fill="none" stroke="${leather}" stroke-width=".6"/>`;
      // shoemaker stitching for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="smk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${benchY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split seam — a burst stitch on errors
      if (r.err) g += `<path d="M ${x - bW * .18} ${benchY - 10} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="smk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="smk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞋匠", eyebrow: "PROVIDER SHOEMAKER", render };
})();
