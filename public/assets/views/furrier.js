/* ------------------------------------------------------------------ furrier
 * Furrier view — a row of fur racks, one per provider.
 * Pelts hanging on the rails = tokens; a furrier combing
 * a pelt for live sessions; a moth-eaten pelt marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "furrier";
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
    if (!rows.length) { host.innerHTML = `<div class="frr-empty">暂无皮货</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const railY = floorY - 26;
      const fur = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the rack — two posts with a rail
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="30" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="30" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .38}" y1="${railY}" x2="${x + bW * .32}" y2="${railY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // pelts hanging — fur shapes on hooks, count by tokens
      const pelts = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pelts; p++) {
        const px = x - bW * .3 + p * bW * .16;
        g += `<path d="M ${px} ${railY - 4} l 0 -4 q 2 -3 4 0 l 0 4 q -2 4 -4 0 z" fill="${p === 0 && r.err ? "var(--red)" : fur}" stroke="${r.col}" stroke-width=".6"/>`;
        // the tail — a tuft hanging below
        g += `<path d="M ${px + 2} ${railY} q 0 8 -2 12 q 4 -4 2 -12 z" fill="${p === 0 && r.err ? "var(--red)" : fur}" stroke="${r.col}" stroke-width=".4"/>`;
        // guard hairs — short strokes on the pelt
        g += `<line x1="${px + 1}" y1="${railY - 3}" x2="${px + 1}" y2="${railY - 6}" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<line x1="${px + 3}" y1="${railY - 3}" x2="${px + 3}" y2="${railY - 6}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a furrier's comb — a brush on the floor
      g += `<rect x="${x - bW * .44}" y="${floorY - 6}" width="8" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x - bW * .44 + t * 2}" y1="${floorY - 6}" x2="${x - bW * .44 + t * 2}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a stretching board with a pelt
      g += `<rect x="${x + bW * .06}" y="${floorY - 20}" width="${bW * .26}" height="14" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .1} ${floorY - 18} q 4 -3 8 0 q 4 3 8 0 l 0 8 q -4 3 -8 0 q -4 -3 -8 0 z" fill="${r.err ? "var(--red)" : fur}" stroke="${r.col}" stroke-width=".6"/>`;
      // lacing on the board
      g += `<line x1="${x + bW * .12}" y1="${floorY - 16}" x2="${x + bW * .12}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .2}" y1="${floorY - 16}" x2="${x + bW * .2}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .28}" y1="${floorY - 16}" x2="${x + bW * .28}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      // furrier combing for live sessions — figure at the board
      if (r.live) {
        g += `<g class="frr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${floorY - 34})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // moth-eaten pelt — a hole in the fur on errors
      if (r.err) g += `<circle cx="${x - bW * .3}" cy="${railY - 2}" r="1.6" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="frr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="frr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "皮货", eyebrow: "PROVIDER FURRIER", render };
})();
