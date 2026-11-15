/* ------------------------------------------------------------------- slater
 * Slater view — a row of slated roofs, one per provider.
 * Slates nailed on the roof = tokens; a slater nailing
 * for live sessions; a cracked slate marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "slater";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="slt-empty">暂无瓦顶</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a lane
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const wallTop = floorY - 18;
      const ridge = floorY - 40;
      const slate = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#7a88a0" : "#4c5668";

      // the house — walls, a door, a window
      g += `<rect x="${x - bW * .34}" y="${wallTop}" width="${bW * .68}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .24}" y="${wallTop + 6}" width="7" height="12" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .14}" y="${wallTop + 5}" width="9" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .14}" y1="${wallTop + 9}" x2="${x + bW * .23}" y2="${wallTop + 9}" stroke="${r.col}" stroke-width=".3"/>`;
      g += `<line x1="${x + bW * .185}" y1="${wallTop + 5}" x2="${x + bW * .185}" y2="${wallTop + 13}" stroke="${r.col}" stroke-width=".3"/>`;

      // the roof — a shallow pitch
      g += `<path d="M ${x - bW * .4} ${wallTop} L ${x} ${ridge} L ${x + bW * .4} ${wallTop}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;

      // slate courses — overlapping rows, count by tokens
      const courses = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < courses; c++) {
        const t = c / 4;
        const y0 = wallTop - 3 - c * 7;
        const hw = bW * .38 * (1 - t * .8);
        // a row of slate tabs down each slope
        for (let s = 0; s < 4; s++) {
          const sx = x - hw + s * (hw / 2) + (c % 2 ? hw / 8 : 0);
          g += `<path d="M ${sx} ${y0} l -5 -3 h 10 z" fill="${c === courses - 1 && s === 3 && r.err ? "var(--red)" : slate}" stroke="${r.col}" stroke-width=".4"/>`;
          const sxr = x + hw - s * (hw / 2) - (c % 2 ? hw / 8 : 0);
          g += `<path d="M ${sxr} ${y0} l -5 -3 h 10 z" fill="${slate}" stroke="${r.col}" stroke-width=".4"/>`;
        }
      }
      // ridge tiles — a cap row
      for (let t = 0; t < 5; t++) {
        g += `<path d="M ${x - 6 + t * 3} ${ridge + 1} q 1.5 -4 3 0" fill="none" stroke="${slate}" stroke-width="1.6"/>`;
      }

      // a roof ladder — a hook ladder on the left slope
      g += `<line x1="${x - bW * .44}" y1="${floorY}" x2="${x - bW * .2}" y2="${wallTop - 8}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .4}" y1="${floorY}" x2="${x - bW * .16}" y2="${wallTop - 8}" stroke="${r.col}" stroke-width="1"/>`;
      for (let l = 0; l < 3; l++) {
        const lt = l / 3;
        g += `<line x1="${x - bW * (.44 - .24 * lt)}" y1="${floorY - 4 - l * 5}" x2="${x - bW * (.4 - .24 * lt)}" y2="${floorY - 4 - l * 5}" stroke="${r.col}" stroke-width=".5"/>`;
      }

      // a slate stack — on the ground
      for (let s = 0; s < 4; s++) {
        g += `<rect x="${x + bW * .42}" y="${floorY - 4 - s * 3}" width="12" height="2.6" fill="${slate}" stroke="${r.col}" stroke-width=".4" transform="rotate(${s % 2 ? -3 : 2} ${x + bW * .48} ${floorY - 4 - s * 3})"/>`;
      }
      // a slate axe — leaning
      g += `<line x1="${x + bW * .3}" y1="${floorY - 2}" x2="${x + bW * .34}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 13}" width="5" height="3" rx="1" fill="${slate}" stroke="${r.col}" stroke-width=".5"/>`;

      // slater nailing for live sessions — figure on the roof
      if (r.live) {
        g += `<g class="slt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .16} ${wallTop - 18}) rotate(14)">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="9" y2="1" stroke="${r.col}" stroke-width="1"/>
          <rect x="8" y="-2" width="4" height="2.5" rx="1" fill="${slate}" stroke="${r.col}" stroke-width=".4"/>
        </g>`;
      }
      // cracked slate — a split tab on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${wallTop - 10} l 3 4 -2 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="slt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="slt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "瓦顶", eyebrow: "PROVIDER SLATER", render };
})();
