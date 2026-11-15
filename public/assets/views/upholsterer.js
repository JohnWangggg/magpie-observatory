/* ------------------------------------------------------------- upholsterer
 * Upholsterer view — a row of upholsterers' frames, one per provider.
 * Cushions stacked by the chair frame = tokens; an upholsterer
 * tacking for live sessions; a burst seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "upholsterer";
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
    if (!rows.length) { host.innerHTML = `<div class="uph-empty">暂无软包坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a parlour rug
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const cloth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b86a7a" : "#78404c";

      // the chair frame — seat, back, legs
      const seatY = floorY - 14;
      g += `<rect x="${x - bW * .34}" y="${seatY}" width="${bW * .24}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .32}" y1="${seatY + 5}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .12}" y1="${seatY + 5}" x2="${x - bW * .1}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .34}" y="${seatY - 20}" width="4" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // half-upholstered — a webbing grid on the seat
      for (let w = 0; w < 3; w++) {
        g += `<line x1="${x - bW * .3 + w * 5}" y1="${seatY}" x2="${x - bW * .3 + w * 5}" y2="${seatY + 5}" stroke="${cloth}" stroke-width="1"/>`;
      }
      g += `<line x1="${x - bW * .34}" y1="${seatY + 2.5}" x2="${x - bW * .1}" y2="${seatY + 2.5}" stroke="${cloth}" stroke-width="1"/>`;
      // padding — a tufted back panel
      g += `<rect x="${x - bW * .3}" y="${seatY - 18}" width="9" height="14" rx="2" fill="${cloth}" stroke="${r.col}" stroke-width=".6"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<circle cx="${x - bW * .27 + t * 3}" cy="${seatY - 15 + t * 4}" r=".8" fill="${r.col}"/>`;
      }

      // a bolt of fabric — standing roll
      g += `<rect x="${x - bW * .46}" y="${floorY - 22}" width="6" height="22" rx="3" fill="${cloth}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .43}" cy="${floorY - 22}" rx="3" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .43}" y1="${floorY - 8}" x2="${x - bW * .38}" y2="${floorY - 2}" stroke="${r.col}" stroke-width=".4"/>`;

      // cushion pile — stacked cushions, count by tokens
      const cushions = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < cushions; c++) {
        const cx = x + bW * .14 + (c % 2) * bW * .14;
        const cy = floorY - 4 - Math.floor(c / 2) * 7;
        g += `<rect x="${cx}" y="${cy - 6}" width="${bW * .12}" height="6" rx="2.5"
          fill="${c === cushions - 1 && r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".5" opacity="${.7 + c * .08}"/>`;
        g += `<line x1="${cx + 2}" y1="${cy - 3}" x2="${cx + bW * .12 - 2}" y2="${cy - 3}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // a tack hammer — on the floor
      g += `<line x1="${x + bW * .38}" y1="${floorY - 6}" x2="${x + bW * .44}" y2="${floorY - 2}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .43}" y="${floorY - 6}" width="5" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // tacks — small dots scattered
      for (let t = 0; t < 4; t++) {
        g += `<circle cx="${x + bW * .34 + t * 2.5}" cy="${floorY - 1.5}" r=".8" fill="${r.col}"/>`;
      }
      // a stuffings sack — beside the pile
      g += `<path d="M ${x + bW * .02} ${floorY} l -4 -8 q 4 -4 8 0 l -4 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .01} ${floorY - 9} q 3 -3 6 0" fill="none" stroke="${cloth}" stroke-width=".6"/>`;

      // upholsterer tacking for live sessions — figure at the chair
      if (r.live) {
        g += `<g class="uph-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .08} ${seatY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="5" x2="-12" y2="2" stroke="${r.col}" stroke-width="1"/>
          <rect x="-15" y="0" width="4" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>
        </g>`;
      }
      // burst seam — a rip on the top cushion on errors
      if (r.err) g += `<path d="M ${x + bW * .14 + bW * .14} ${floorY - 10 - Math.floor((cushions - 1) / 2) * 7} l 4 3 -3 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="uph-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="uph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "软包坊", eyebrow: "PROVIDER UPHOLSTERER", render };
})();
