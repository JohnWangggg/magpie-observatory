/* --------------------------------------------------------------- feltmaker
 * Feltmaker view — a row of felting tables, one per provider.
 * Felt layers stacked on the mat = tokens; a feltmaker rolling
 * the mat for live sessions; a torn felt edge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "feltmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="flt-empty">暂无毡坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — packed earth
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const tabY = floorY - 14;
      const felt = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8a8c8" : "#8070a0";

      // the table — a plank on trestles
      g += `<rect x="${x - bW * .38}" y="${tabY}" width="${bW * .76}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .3}" y1="${tabY + 5}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .3}" y1="${tabY + 5}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;

      // the mat — a rolled reed mat under the felt
      g += `<rect x="${x - bW * .3}" y="${tabY - 4}" width="${bW * .6}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let m = 0; m < 5; m++) {
        g += `<line x1="${x - bW * .3 + m * bW * .14}" y1="${tabY - 4}" x2="${x - bW * .3 + m * bW * .14}" y2="${tabY}" stroke="${r.col}" stroke-width=".25"/>`;
      }

      // felt layers — stacked sheets, count by tokens
      const layers = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let l = 0; l < layers; l++) {
        const ly = tabY - 8 - l * 3.4;
        g += `<path d="M ${x - bW * .24} ${ly} q ${bW * .12} -2 ${bW * .24} 0 q ${bW * .12} 2 ${bW * .24} 0 l 0 3 q -${bW * .12} 2 -${bW * .24} 0 q -${bW * .12} -2 -${bW * .24} 0 z"
          fill="${l === layers - 1 && r.err ? "var(--red)" : felt}" stroke="${r.col}" stroke-width=".5" opacity="${.6 + l * .1}"/>`;
      }

      // a rolled felt bundle — a cylinder beside the stack
      g += `<rect x="${x + bW * .32}" y="${tabY - 10}" width="${bW * .12}" height="8" rx="4" fill="${felt}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .38}" cy="${tabY - 10}" rx="${bW * .06}" ry="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;

      // a water bowl — for sprinkling
      g += `<rect x="${x - bW * .44}" y="${floorY - 8}" width="10" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .44 + 5}" cy="${floorY - 7}" rx="4" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;

      // a hanging felt — a finished hood on a peg
      g += `<circle cx="${x + bW * .42}" cy="${tabY - 26}" r="1.2" fill="${r.col}"/>`;
      g += `<path d="M ${x + bW * .42} ${tabY - 25} q -8 2 -8 10 q 0 5 8 5 q 8 0 8 -5 q 0 -8 -8 -10 z"
        fill="${r.err ? "#c06050" : felt}" stroke="${r.col}" stroke-width=".6" opacity=".85"/>`;
      g += `<path d="M ${x + bW * .38} ${tabY - 14} q 4 3 8 0" fill="none" stroke="${r.col}" stroke-width=".5"/>`;

      // feltmaker rolling for live sessions — figure at the table
      if (r.live) {
        g += `<g class="flt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${tabY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="14" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="7" x2="-12" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn felt — a ripped edge on errors
      if (r.err) g += `<path d="M ${x - bW * .1} ${tabY - 8 - layers * 3.4} l 4 6 -2 4 5 5" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="flt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="flt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "毡坊", eyebrow: "PROVIDER FELTMAKER", render };
})();
