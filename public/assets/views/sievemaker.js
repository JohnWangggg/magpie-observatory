/* -------------------------------------------------------------- sievemaker
 * Sievemaker view — a row of sieve benches, one per provider.
 * Sieves hung on the frame = tokens; a sievemaker stitching
 * the mesh for live sessions; a torn mesh marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sievemaker";
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
    if (!rows.length) { host.innerHTML = `<div class="svm-empty">暂无筛坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — workshop boards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const benchY = floorY - 14;
      const rim = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#906838";

      // the bench — a plank on trestles
      g += `<rect x="${x - bW * .38}" y="${benchY}" width="${bW * .76}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .3}" y1="${benchY + 5}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .3}" y1="${benchY + 5}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;

      // a sieve on the bench — a hoop with cross mesh
      g += `<circle cx="${x - bW * .12}" cy="${benchY - 8}" r="8" fill="var(--card-2)" stroke="${rim}" stroke-width="1.4"/>`;
      for (let m = -2; m <= 2; m++) {
        g += `<line x1="${x - bW * .12 + m * 3}" y1="${benchY - 8 - Math.sqrt(64 - m * m * 9) * .9}" x2="${x - bW * .12 + m * 3}" y2="${benchY - 8 + Math.sqrt(64 - m * m * 9) * .9}" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<line x1="${x - bW * .12 - Math.sqrt(64 - m * m * 9) * .9}" y1="${benchY - 8 + m * 3}" x2="${x - bW * .12 + Math.sqrt(64 - m * m * 9) * .9}" y2="${benchY - 8 + m * 3}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // a frame stand — uprights with hung sieves, count by tokens
      g += `<line x1="${x + bW * .14}" y1="${floorY}" x2="${x + bW * .14}" y2="${benchY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .42}" y1="${floorY}" x2="${x + bW * .42}" y2="${benchY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .1}" y1="${benchY - 30}" x2="${x + bW * .46}" y2="${benchY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      const sieves = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < sieves; s++) {
        const sx = x + bW * .17 + s * bW * .12;
        g += `<line x1="${sx}" y1="${benchY - 30}" x2="${sx}" y2="${benchY - 24}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${sx}" cy="${benchY - 19}" r="5.5" fill="var(--card-2)" stroke="${s === 0 && r.err ? "var(--red)" : rim}" stroke-width="1"/>`;
        g += `<line x1="${sx - 4}" y1="${benchY - 19}" x2="${sx + 4}" y2="${benchY - 19}" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<line x1="${sx}" y1="${benchY - 23}" x2="${sx}" y2="${benchY - 15}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // a coil of wire — mesh material
      g += `<circle cx="${x + bW * .02}" cy="${benchY - 4}" r="4" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .02}" cy="${benchY - 4}" r="1.8" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      // a rim strip — bent wood for hoops
      g += `<path d="M ${x - bW * .34} ${benchY - 4} a 6 3 0 0 1 12 0" fill="none" stroke="${rim}" stroke-width="1.6"/>`;
      // a shears — for cutting mesh
      g += `<line x1="${x - bW * .28}" y1="${benchY - 2}" x2="${x - bW * .22}" y2="${benchY - 8}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .28}" y1="${benchY - 8}" x2="${x - bW * .22}" y2="${benchY - 2}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x - bW * .25}" cy="${benchY - 5}" r="1" fill="${r.col}"/>`;

      // sievemaker stitching for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="svm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .04} ${benchY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="10" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="-8" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn mesh — a gap in the weave on errors
      if (r.err) g += `<path d="M ${x - bW * .15} ${benchY - 10} l 4 4 M ${x - bW * .11} ${benchY - 10} l -4 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="svm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="svm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "筛坊", eyebrow: "PROVIDER SIEVEMAKER", render };
})();
