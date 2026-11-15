/* --------------------------------------------------------------- seamstress
 * Seamstress view — a row of sewing tables, one per provider.
 * Garments folded on the table = tokens; a seamstress
 * hemming for live sessions; a dropped stitch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "seamstress";
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
    if (!rows.length) { host.innerHTML = `<div class="sms-empty">暂无缝衣</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the table — a sewing surface
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const cloth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a7a9a" : "#3a4a5c";
      // the table — a work surface
      g += `<rect x="${x - bW * .4}" y="${benchY - 4}" width="${bW * .8}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a garment being hemmed — a dress laid flat
      g += `<path d="M ${x - bW * .28} ${benchY - 10} l 6 -4 l 10 0 l 6 4 l -2 8 l -18 0 z" fill="${r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .26} ${benchY - 4} l -4 6 q 10 4 22 0 l -4 -6 z" fill="${cloth}" stroke="${r.col}" stroke-width=".6"/>`;
      // folded garments — stacks on the table, count by tokens
      const folds = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < folds; f++) {
        const fx = x + bW * .04 + f * bW * .12;
        g += `<rect x="${fx}" y="${benchY - 12 - (f % 2) * 3}" width="10" height="5" rx="1" fill="${f === 0 && r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${fx}" y1="${benchY - 10 - (f % 2) * 3}" x2="${fx + 10}" y2="${benchY - 10 - (f % 2) * 3}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a needle — a fine line threaded
      g += `<line x1="${x + bW * .34}" y1="${benchY - 8}" x2="${x + bW * .36}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${benchY - 15}" r=".9" fill="none" stroke="${r.col}" stroke-width=".4"/>`;
      // thread spools — a bobbin beside
      g += `<ellipse cx="${x - bW * .42}" cy="${benchY - 4}" rx="4" ry="3" fill="${cloth}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .42} ${benchY - 4} q 4 -4 8 -2" fill="none" stroke="${cloth}" stroke-width=".6"/>`;
      // a basket of scraps — a container with bits
      g += `<path d="M ${x + bW * .34} ${benchY - 4} l 4 -10 4 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let s = 0; s < 2; s++) {
        g += `<line x1="${x + bW * .36 + s * 2}" y1="${benchY - 10}" x2="${x + bW * .36 + s * 2}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a thimble and scissors
      g += `<circle cx="${x + bW * .44}" cy="${benchY - 6}" r="1.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // seamstress hemming for live sessions — figure at the table
      if (r.live) {
        g += `<g class="sms-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .16} ${benchY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // dropped stitch — a loop of thread on errors
      if (r.err) g += `<path d="M ${x - bW * .26} ${benchY - 10} q 4 6 8 2" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="sms-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sms-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缝衣", eyebrow: "PROVIDER SEAMSTRESS", render };
})();
