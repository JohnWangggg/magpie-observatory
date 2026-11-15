/* ---------------------------------------------------------------- dressmaker
 * Dressmaker view — a row of sewing boards, one per provider.
 * Gowns pinned on the board = tokens; a dressmaker
 * basting a seam for live sessions; a slipped stitch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dressmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="drsm-empty">暂无女服</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the board — a sewing table
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const silk = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#7a5a8a" : "#4a3a50";
      // the board — a wide sewing table
      g += `<rect x="${x - bW * .4}" y="${benchY - 4}" width="${bW * .8}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a gown laid out — a bodice with a skirt
      g += `<path d="M ${x - bW * .3} ${benchY - 10} l 6 -4 l 10 0 l 6 4 l -2 8 l -18 0 z" fill="${r.err ? "var(--red)" : silk}" stroke="${r.col}" stroke-width=".7"/>`;
      // the skirt — a flared shape below the bodice
      g += `<path d="M ${x - bW * .28} ${benchY - 4} l -4 8 q 10 4 22 0 l -4 -8 z" fill="${silk}" stroke="${r.col}" stroke-width=".6"/>`;
      // a sash at the waist
      g += `<line x1="${x - bW * .26}" y1="${benchY - 8}" x2="${x - bW * .16}" y2="${benchY - 8}" stroke="${r.col}" stroke-width=".5"/>`;
      // pinned pieces — pattern shapes on the board, count by tokens
      const pieces = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pieces; p++) {
        const px = x + bW * .04 + p * bW * .12;
        g += `<path d="M ${px} ${benchY - 12} l 5 -3 4 5 l -5 3 z" fill="${p === 0 && r.err ? "var(--red)" : silk}" stroke="${r.col}" stroke-width=".5"/>`;
        // a pin
        g += `<circle cx="${px + 2}" cy="${benchY - 10}" r="1" fill="${r.col}"/>`;
      }
      // a tape measure — a curled ribbon on the board
      g += `<path d="M ${x - bW * .44} ${benchY - 8} q 4 -6 8 -4 q -4 4 -8 4" fill="none" stroke="${silk}" stroke-width=".8"/>`;
      // a pin cushion — a small mound
      g += `<ellipse cx="${x + bW * .3}" cy="${benchY - 6}" rx="4" ry="2.4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let p = 0; p < 3; p++) {
        g += `<line x1="${x + bW * .28 + p * 1.5}" y1="${benchY - 6}" x2="${x + bW * .28 + p * 1.5}" y2="${benchY - 9}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a thimble
      g += `<circle cx="${x + bW * .4}" cy="${benchY - 6}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // dressmaker basting for live sessions — figure at the board
      if (r.live) {
        g += `<g class="drsm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${benchY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // slipped stitch — a loose thread on errors
      if (r.err) g += `<path d="M ${x - bW * .28} ${benchY - 10} q 4 6 8 2" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="drsm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="drsm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "女服", eyebrow: "PROVIDER DRESSMAKER", render };
})();
