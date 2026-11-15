/* ------------------------------------------------------------------- luthier
 * Luthier view — a row of violin benches, one per provider.
 * Finished fiddles hanging on the rack = tokens; a luthier
 * carving a scroll for live sessions; a cracked belly marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "luthier";
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
    if (!rows.length) { host.innerHTML = `<div class="lu-empty">暂无提琴坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const varnish = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c07838" : "#785030";
      const bW = seg * .4;
      const bTop = floorY - 34;
      // the bench — a workbench with a vice
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .42}" y1="${bTop + 5}" x2="${x - bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .42}" y1="${bTop + 5}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the vice on the bench edge
      g += `<rect x="${x + bW * .38}" y="${bTop - 4}" width="6" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // a violin belly clamped on the bench — figure-8 body
      g += `<path d="M ${x - 8} ${bTop - 2} a 4 4 0 1 1 8 -3 a 5 5 0 1 1 -8 3 z" fill="${varnish}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - 2}" y1="${bTop - 11}" x2="${x - 2}" y2="${bTop - 16}" stroke="${r.col}" stroke-width="1.1"/>`;
      // f-holes
      g += `<path d="M ${x - 6} ${bTop - 6} q 1 3 -1 5" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + 1} ${bTop - 6} q 1 3 -1 5" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // hanging rack — a rail with finished fiddles, count by tokens
      g += `<line x1="${x + bW * .52}" y1="${bTop - 20}" x2="${x + bW * .52}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .44}" y1="${bTop - 16}" x2="${x + bW * .62}" y2="${bTop - 16}" stroke="${r.col}" stroke-width="1"/>`;
      const fiddles = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fiddles; f++) {
        const fx = x + bW * .46 + f * bW * .07;
        g += `<path d="M ${fx} ${bTop - 14} a 2.6 2.6 0 1 0 4 3 a 3 3 0 1 0 -4 -3 z" fill="${f === 0 && r.err ? "var(--red)" : varnish}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${fx + 2}" y1="${bTop - 16}" x2="${fx + 2}" y2="${bTop - 20}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // wood shavings on the floor
      for (let sh = 0; sh < 3; sh++) {
        g += `<path d="M ${x - bW * .3 + sh * 5} ${floorY - 2} q 2 -2 4 0" fill="none" stroke="${varnish}" stroke-width=".7" opacity=".6"/>`;
      }
      // luthier carving for live sessions
      if (r.live) {
        g += `<g class="lu-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .52} ${bTop - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked belly — a split in the body on errors
      if (r.err) g += `<path d="M ${x - 6} ${bTop - 9} l 5 4 l -2 3" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lu-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "提琴坊", eyebrow: "PROVIDER LUTHIER", render };
})();
