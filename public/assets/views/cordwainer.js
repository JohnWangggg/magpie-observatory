/* --------------------------------------------------------------- cordwainer
 * Cordwainer view — a row of cordovan benches, one per provider.
 * Fine shoes on the board = tokens; a cordwainer sewing
 * a welt for live sessions; a cracked sole marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cordwainer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cdw-empty">暂无革鞋</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the board — a cutting and sewing surface
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#6a4a5a" : "#3a2a30";
      // the bench — a work slab
      g += `<rect x="${x - bW * .38}" y="${benchY - 4}" width="${bW * .76}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a last — a foot form clamped on the bench
      g += `<path d="M ${x - bW * .32} ${benchY - 14} q 4 -6 8 -6 q 4 0 4 6 l 0 6 q -8 2 -12 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .28}" y1="${benchY - 14}" x2="${x - bW * .28}" y2="${benchY - 20}" stroke="${r.col}" stroke-width=".7"/>`;
      // a fine shoe — a court shoe on the bench
      g += `<path d="M ${x - bW * .18} ${benchY - 8} l 0 -5 q 2 -3 4 0 l 0 5 q -2 2 -4 0 z" fill="${r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .15} ${benchY - 8} q 2 -2 3 0 q -1 2 -3 0 z" fill="${r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".4"/>`;
      // a buckle on the shoe
      g += `<rect x="${x - bW * .16}" y="${benchY - 12}" width="3" height="2" fill="none" stroke="${r.col}" stroke-width=".4"/>`;
      // shoes lined up — pairs on the board, count by tokens
      const pairs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < pairs; s++) {
        const sx = x - bW * .08 + s * bW * .12;
        g += `<path d="M ${sx} ${benchY - 8} l 0 -4 q 1.5 -2 3 0 l 0 4 q -1.5 1 -3 0 z" fill="${s === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // leather sheets — cut pieces stacked
      for (let p = 0; p < 3; p++) {
        g += `<rect x="${x + bW * .12}" y="${benchY - 6 - p * 3}" width="10" height="3" fill="${leather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // an awl — a pointed tool in a handle
      g += `<line x1="${x + bW * .32}" y1="${benchY - 8}" x2="${x + bW * .36}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${benchY - 15}" r="1.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // a welt — a strip of leather on the bench
      g += `<rect x="${x + bW * .2}" y="${benchY - 4}" width="${bW * .18}" height="3" rx="1" fill="${leather}" stroke="${r.col}" stroke-width=".4"/>`;
      // cordwainer sewing for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="cdw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .12} ${benchY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked sole — a fissure on errors
      if (r.err) g += `<path d="M ${x - bW * .18} ${benchY - 10} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cdw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cdw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "革鞋", eyebrow: "PROVIDER CORDWAINER", render };
})();
