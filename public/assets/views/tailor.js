/* ------------------------------------------------------------------- tailor
 * Tailor view — a row of cutting boards, one per provider.
 * Cloth pieces pinned on the board = tokens; a tailor
 * stitching a seam for live sessions; a cut edge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tailor";
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
    if (!rows.length) { host.innerHTML = `<div class="tlr-empty">暂无裁缝</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the board — a cutting table
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const cloth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a7a9a" : "#3a4a5c";
      // the cutting board — a wide slab
      g += `<rect x="${x - bW * .4}" y="${benchY - 4}" width="${bW * .8}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a garment laid out — a jacket shape pinned
      g += `<path d="M ${x - bW * .32} ${benchY - 8} l 8 -4 l 12 0 l 8 4 l -4 8 l -16 0 z" fill="${r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".7"/>`;
      // sleeves
      g += `<path d="M ${x - bW * .32} ${benchY - 8} l -6 -2 l 2 8 l 4 2 z" fill="${cloth}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x - bW * .12} ${benchY - 8} l 6 -2 l -2 8 l -4 2 z" fill="${cloth}" stroke="${r.col}" stroke-width=".5"/>`;
      // pins — small marks on the garment
      for (let p = 0; p < 3; p++) {
        g += `<circle cx="${x - bW * .26 + p * 8}" cy="${benchY - 6}" r="1" fill="${r.col}"/>`;
      }
      // cloth pieces — bolts and scraps, count by tokens
      const pieces = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let pc = 0; pc < pieces; pc++) {
        const px = x + bW * .06 + pc * bW * .12;
        g += `<rect x="${px}" y="${benchY - 12 - (pc % 2) * 3}" width="10" height="5" rx="1" fill="${pc === 0 && r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // shears — large scissors on the board
      g += `<line x1="${x + bW * .34}" y1="${benchY - 8}" x2="${x + bW * .4}" y2="${benchY - 18}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .38}" y1="${benchY - 8}" x2="${x + bW * .32}" y2="${benchY - 18}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${benchY - 6}" r="2" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      // a measuring tape — a curled ribbon
      g += `<path d="M ${x - bW * .44} ${benchY - 8} q 4 -6 8 -4 q -4 4 -8 4" fill="none" stroke="${cloth}" stroke-width=".8"/>`;
      // a thimble and needle cushion
      g += `<circle cx="${x + bW * .22}" cy="${benchY - 6}" r="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x - bW * .44}" y="${benchY - 12}" width="${bW * .14}" height="6" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // tailor stitching for live sessions — figure at the board
      if (r.live) {
        g += `<g class="tlr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .2} ${benchY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cut edge — a wrong cut on the cloth on errors
      if (r.err) g += `<path d="M ${x - bW * .26} ${benchY - 10} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tlr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tlr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "裁缝", eyebrow: "PROVIDER TAILOR", render };
})();
