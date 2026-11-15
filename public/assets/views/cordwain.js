/* ------------------------------------------------------------------ cordwain
 * Cordwain view — a row of last benches, one per provider.
 * Shoes on the vamp shelf = tokens; a cordwainer lasting for
 * live sessions; a burst seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cordwain";
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
    if (!rows.length) { host.innerHTML = `<div class="cd-empty">暂无制鞋坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0a060" : "#a07848";
      const benchY = floorY - 22;
      const benchW = seg * .5;
      // the bench — a last anvil on a stool
      g += `<line x1="${x - benchW / 2}" y1="${benchY}" x2="${x + benchW / 2}" y2="${benchY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - benchW * .3}" y1="${benchY}" x2="${x - benchW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + benchW * .3}" y1="${benchY}" x2="${x + benchW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the last — a foot-shaped form on the bench
      g += `<path d="M ${x - benchW * .1} ${benchY - 6} l 10 -4 l 8 4 l -2 4 l -16 0 z" fill="${leather}" stroke="${r.col}" stroke-width="1"/>`;
      // uppers cut and sewn — shoes on the vamp shelf, count by tokens
      const shoes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < shoes; s++) {
        const sx = x - benchW * .34 + s * 12;
        g += `<path d="M ${sx} ${benchY - 3} l 6 -5 l 8 5 l -2 3 l -12 0 z" fill="${s === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // welt channel — a stitched sole line
      g += `<line x1="${x - benchW * .28}" y1="${benchY - 1}" x2="${x + benchW * .12}" y2="${benchY - 1}" stroke="${leather}" stroke-width=".8" stroke-dasharray="3 2"/>`;
      // awl — a pointed tool on the bench
      g += `<line x1="${x + benchW * .14}" y1="${benchY - 6}" x2="${x + benchW * .18}" y2="${benchY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // cordwainer lasting for live sessions — figure pulling on the last
      if (r.live) {
        g += `<g class="cd-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - benchW * .4} ${benchY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst seam — a gap in the sole on errors
      if (r.err) g += `<path d="M ${x - benchW * .1} ${benchY - 1} l 6 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cd-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "制鞋坊", eyebrow: "PROVIDER CORDWAIN", render };
})();
