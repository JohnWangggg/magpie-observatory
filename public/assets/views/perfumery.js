/* ----------------------------------------------------------------- perfumery
 * Perfumery view — a row of perfumer's benches, one per provider.
 * Essence bottles on the shelf = tokens; a perfumer stirring
 * an alembic for live sessions; a spilled attar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "perfumery";
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
    if (!rows.length) { host.innerHTML = `<div class="pf-empty">暂无调香坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const attar = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8a0c8" : "#8860a0";
      const bW = seg * .38;
      const bTop = floorY - 30;
      // the workbench
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .42}" y1="${bTop + 5}" x2="${x - bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + bW * .42}" y1="${bTop + 5}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      // the alembic — a still pot with a swan neck on the bench
      g += `<ellipse cx="${x - bW * .16}" cy="${bTop - 4}" rx="9" ry="7" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - bW * .16 - 3} ${bTop - 10} q 2 -8 10 -8 q 8 0 8 6" fill="none" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<circle cx="${x - bW * .16 + 9}" cy="${bTop - 13}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // scented vapour rising from the receiver
      for (let v = 0; v < 2; v++) {
        g += `<path d="M ${x - bW * .16 + 10 + v * 4} ${bTop - 16} q 2 -4 0 -7" fill="none" stroke="${attar}" stroke-width=".8" opacity=".6"/>`;
      }
      // receiver flask catching the distillate
      g += `<path d="M ${x + bW * .05} ${bTop - 4} a 4.5 4.5 0 0 1 9 0 z" fill="${attar}" opacity=".6" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .09}" y1="${bTop - 4}" x2="${x + bW * .09}" y2="${bTop - 9}" stroke="${r.col}" stroke-width=".8"/>`;
      // essence bottles — a tiered shelf above, count by tokens
      g += `<line x1="${x + bW * .3}" y1="${bTop - 20}" x2="${x + bW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .22}" y1="${bTop - 16}" x2="${x + bW * .42}" y2="${bTop - 16}" stroke="${r.col}" stroke-width="1"/>`;
      const bottles = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bottles; b++) {
        const bx = x + bW * .23 + b * bW * .07;
        g += `<rect x="${bx}" y="${bTop - 22}" width="4" height="6" rx="1" fill="${b === 0 && r.err ? "var(--red)" : attar}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${bx + 1}" y1="${bTop - 22}" x2="${bx + 1}" y2="${bTop - 24}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // a flower basket beside the bench — lavender or rose
      g += `<path d="M ${x - bW * .64} ${floorY - 8} l 2 -5 h 8 l 2 5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      for (let f = 0; f < 3; f++) g += `<circle cx="${x - bW * .64 + 3 + f * 3}" cy="${floorY - 11}" r="1.6" fill="${f === 0 && r.err ? "var(--red)" : attar}"/>`;
      // perfumer stirring for live sessions
      if (r.live) {
        g += `<g class="pf-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .5} ${bTop - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="11" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // spilled attar — a tipped bottle on errors
      if (r.err) {
        g += `<path d="M ${x + bW * .3} ${floorY - 3} q 4 1 8 0" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
        g += `<rect x="${x + bW * .44}" y="${floorY - 5}" width="5" height="3" rx="1" fill="var(--red)" opacity=".7" transform="rotate(30 ${x + bW * .44} ${floorY - 5})"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pf-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "调香坊", eyebrow: "PROVIDER PERFUMERY", render };
})();
