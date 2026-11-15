/* --------------------------------------------------------------- fellmonger
 * Fellmonger view — a row of wool racks, one per provider.
 * Fleeces bundled on the shelf = tokens; a fellmonger
 * grading for live sessions; a moth-eaten fleece marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fellmonger";
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
    if (!rows.length) { host.innerHTML = `<div class="fm2-empty">暂无羊毛</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const shelfY = floorY - 24;
      const wool = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a8" : "#a09070";
      // the rack — a shelf with posts
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="28" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="28" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .38}" y1="${shelfY}" x2="${x + bW * .32}" y2="${shelfY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .38}" y1="${shelfY - 10}" x2="${x + bW * .32}" y2="${shelfY - 10}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      // fleeces — woolly bundles on the shelf, count by tokens
      const fleeces = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < fleeces; f++) {
        const fx = x - bW * .3 + f * bW * .16;
        g += `<ellipse cx="${fx}" cy="${shelfY - 6}" rx="6" ry="4" fill="${f === 0 && r.err ? "var(--red)" : wool}" stroke="${r.col}" stroke-width=".6"/>`;
        // fleece texture — small curls
        g += `<circle cx="${fx - 2}" cy="${shelfY - 7}" r="1" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<circle cx="${fx + 1}" cy="${shelfY - 5}" r="1" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<circle cx="${fx + 3}" cy="${shelfY - 7}" r="1" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a grading table — a board with sorted tufts
      g += `<rect x="${x - bW * .2}" y="${floorY - 8}" width="${bW * .4}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // sorted tufts on the table
      for (let t = 0; t < 3; t++) {
        g += `<ellipse cx="${x - bW * .1 + t * 8}" cy="${floorY - 10}" rx="3" ry="2" fill="${t === 0 && r.err ? "var(--red)" : wool}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a wool card — a comb with teeth
      g += `<rect x="${x - bW * .44}" y="${floorY - 6}" width="8" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x - bW * .44 + t * 2}" y1="${floorY - 6}" x2="${x - bW * .44 + t * 2}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a bale below — a bundled fleece pack
      g += `<rect x="${x + bW * .28}" y="${floorY - 10}" width="${bW * .16}" height="10" rx="2" fill="${wool}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .28}" y1="${floorY - 7}" x2="${x + bW * .44}" y2="${floorY - 7}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .28}" y1="${floorY - 3}" x2="${x + bW * .44}" y2="${floorY - 3}" stroke="${r.col}" stroke-width=".4"/>`;
      // fellmonger grading for live sessions — figure at the table
      if (r.live) {
        g += `<g class="fm2-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .12} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // moth-eaten fleece — a hole in the wool on errors
      if (r.err) g += `<circle cx="${x - bW * .3}" cy="${shelfY - 6}" r="1.8" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="fm2-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fm2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "羊毛商", eyebrow: "PROVIDER FELLMONGER", render };
})();
