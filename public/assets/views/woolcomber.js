/* --------------------------------------------------------------- woolcomber
 * Woolcomber view — a row of combing stocks, one per provider.
 * Slivers on the stock = tokens; a woolcomber drawing
 * for live sessions; a matted tuft marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "woolcomber";
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
    if (!rows.length) { host.innerHTML = `<div class="wcm-empty">暂无梳毛</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const stockY = floorY - 18;
      const wool = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a8" : "#a09070";
      // the stock — a post with a comb holder
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="22" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .4}" y="${stockY}" width="10" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // a comb — a toothed pad in the holder
      g += `<rect x="${x - bW * .4}" y="${stockY - 10}" width="10" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x - bW * .4 + t * 2.5}" y1="${stockY - 10}" x2="${x - bW * .4 + t * 2.5}" y2="${stockY - 2}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // the second comb — a matching pad on a post
      g += `<rect x="${x + bW * .3}" y="${floorY - 4}" width="6" height="22" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .28}" y="${stockY}" width="10" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .28}" y="${stockY - 10}" width="10" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x + bW * .28 + t * 2.5}" y1="${stockY - 10}" x2="${x + bW * .28 + t * 2.5}" y2="${stockY - 2}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // slivers — drawn-out fibres between the combs, count by tokens
      const slivers = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < slivers; s++) {
        const sy = stockY - 6 + s * 3;
        g += `<path d="M ${x - bW * .3} ${sy} q ${bW * .15} -3 ${bW * .3} 0" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : wool}" stroke-width=".8"/>`;
      }
      // a drawn sliver — a wound ball on the floor
      g += `<circle cx="${x + bW * .1}" cy="${floorY - 6}" r="4" fill="none" stroke="${wool}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .1}" cy="${floorY - 6}" r="1.5" fill="none" stroke="${wool}" stroke-width=".5"/>`;
      // a tuft basket — a container with fibre
      g += `<path d="M ${x - bW * .44} ${floorY - 4} l 4 -10 4 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .4}" cy="${floorY - 8}" rx="3" ry="2" fill="${wool}" stroke="${r.col}" stroke-width=".4"/>`;
      // a billy — a water pot for sprinkling
      g += `<rect x="${x + bW * .4}" y="${floorY - 6}" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .4}" y1="${floorY - 3}" x2="${x + bW * .48}" y2="${floorY - 3}" stroke="${r.col}" stroke-width=".3"/>`;
      // woolcomber drawing for live sessions — figure between the combs
      if (r.live) {
        g += `<g class="wcm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${stockY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="12" y2="8" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // matted tuft — a tangled mass on errors
      if (r.err) g += `<path d="M ${x - bW * .05} ${stockY - 6} q 4 4 8 0 q -4 -4 -8 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="wcm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wcm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "梳羊毛", eyebrow: "PROVIDER WOOLCOMBER", render };
})();
