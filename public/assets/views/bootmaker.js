/* ----------------------------------------------------------------- bootmaker
 * Bootmaker view — a row of boot trees, one per provider.
 * Boots on the trees = tokens; a bootmaker pulling
 * a last for live sessions; a split welt marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bootmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="btm-empty">暂无靴匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const treeY = floorY - 22;
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#6a4a3a" : "#3a2a20";
      // the bench — a low work table
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="${bW * .76}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .34}" y1="${floorY + 4}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .34}" y1="${floorY + 4}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      // a boot tree — a tall last standing on the bench
      g += `<rect x="${x - bW * .36}" y="${treeY - 4}" width="8" height="18" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .32}" y1="${treeY - 4}" x2="${x - bW * .32}" y2="${treeY - 14}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x - bW * .36} ${treeY + 14} l -2 4 h 12 l -2 -4 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // boots on the bench — tall boots on trees, count by tokens
      const boots = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < boots; b++) {
        const bx = x - bW * .24 + b * bW * .14;
        // a boot shape — tall shaft, toe, heel
        g += `<path d="M ${bx} ${floorY - 8} l 0 -14 q 2 -3 4 0 l 0 14 q -2 2 -4 0 z" fill="${b === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${bx + 3} ${floorY - 8} q 2 -2 3 0 q -1 2 -3 0 z" fill="${b === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".4"/>`;
        // a strap at the top
        g += `<line x1="${bx}" y1="${floorY - 20}" x2="${bx + 4}" y2="${floorY - 20}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a last being pulled — a hinged form on the bench
      g += `<path d="M ${x + bW * .1} ${floorY - 8} q 4 -4 8 -2 q 4 2 8 4 l 0 6 q -8 2 -16 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .12}" y1="${floorY - 8}" x2="${x + bW * .12}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".6"/>`;
      // a hammer — a cobbler's hammer
      g += `<line x1="${x + bW * .34}" y1="${floorY - 10}" x2="${x + bW * .38}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<rect x="${x + bW * .36}" y="${floorY - 18}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // a waxed thread — a ball with a tail
      g += `<circle cx="${x + bW * .44}" cy="${floorY - 6}" r="2.2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .44} ${floorY - 6} q 3 -4 6 -2" fill="none" stroke="${leather}" stroke-width=".5"/>`;
      // bootmaker pulling for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="btm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .08} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split welt — a burst edge on errors
      if (r.err) g += `<path d="M ${x - bW * .24} ${floorY - 10} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="btm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="btm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "靴匠", eyebrow: "PROVIDER BOOTMAKER", render };
})();
