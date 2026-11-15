/* ------------------------------------------------------------------- glover
 * Glover view — a row of cutting boards, one per provider.
 * Glove patterns laid out = tokens; a glover stitching
 * a finger for live sessions; a torn thumb marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glover";
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
    if (!rows.length) { host.innerHTML = `<div class="glv-empty">暂无手套</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the cutting board — a plank table
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the board — a cutting slab
      g += `<rect x="${x - bW * .38}" y="${benchY - 4}" width="${bW * .76}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // glove patterns — hand shapes laid flat, count by tokens
      const gloves = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let gI = 0; gI < gloves; gI++) {
        const gx = x - bW * .32 + gI * bW * .18;
        // a glove shape — palm with fingers
        g += `<path d="M ${gx} ${benchY - 10} l 0 -8 q 2 -3 4 0 l 0 8 q -2 2 -4 0 z" fill="${gI === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".6"/>`;
        // fingers — three small lobes
        for (let f = 0; f < 3; f++) {
          g += `<path d="M ${gx + f * 2} ${benchY - 18} q 0 -3 1.5 -3 q 1.5 0 1.5 3 l 0 6 q -1.5 2 -1.5 0 z" fill="${gI === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".4"/>`;
        }
        // thumb
        g += `<path d="M ${gx + 4} ${benchY - 14} q 3 -2 4 1 q -1 3 -4 2 z" fill="${gI === 0 && r.err ? "var(--red)" : leather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a cutting knife — a curved blade
      g += `<path d="M ${x + bW * .2} ${benchY - 8} q 6 -4 8 -8 q 2 2 -2 8 q -4 4 -6 0" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .28}" y1="${benchY - 16}" x2="${x + bW * .3}" y2="${benchY - 20}" stroke="${r.col}" stroke-width=".9"/>`;
      // a pattern card with markings
      g += `<rect x="${x - bW * .44}" y="${benchY - 18}" width="${bW * .16}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .44}" y1="${benchY - 16}" x2="${x - bW * .28}" y2="${benchY - 16}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x - bW * .44}" y1="${benchY - 12}" x2="${x - bW * .32}" y2="${benchY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      // thread and needle
      g += `<path d="M ${x + bW * .34} ${benchY - 12} q 3 -4 6 0" fill="none" stroke="${leather}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .4}" y1="${benchY - 12}" x2="${x + bW * .4}" y2="${benchY - 16}" stroke="${r.col}" stroke-width=".6"/>`;
      // glover stitching for live sessions — figure at the board
      if (r.live) {
        g += `<g class="glv-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${benchY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn thumb — a ripped edge on errors
      if (r.err) g += `<path d="M ${x - bW * .32} ${benchY - 18} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="glv-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="glv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "手套坊", eyebrow: "PROVIDER GLOVER", render };
})();
