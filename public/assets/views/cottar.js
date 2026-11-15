/* ------------------------------------------------------------------- cottar
 * Cottar view — a row of cottars' plots, one per provider.
 * Beds hoed in the plot = tokens; a cottar hoeing
 * for live sessions; a blighted row marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cottar";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .9;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cot-empty">暂无园圃</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const green = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#78a058" : "#406038";

      // the cot — a small bothy
      g += `<rect x="${x - bW * .42}" y="${floorY - 18}" width="${bW * .2}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .42} ${floorY - 18} L ${x - bW * .32} ${floorY - 26} L ${x - bW * .22} ${floorY - 18}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x - bW * .34}" y="${floorY - 10}" width="6" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x - bW * .3}" cy="${floorY - 20}" r="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      // a wisp of smoke
      g += `<path d="M ${x - bW * .3} ${floorY - 27} q -2 -3 0 -5" fill="none" stroke="var(--muted)" stroke-width=".6" opacity=".6"/>`;

      // the plot — a fenced garden with hoed beds
      g += `<rect x="${x - bW * .16}" y="${floorY - 16}" width="${bW * .56}" height="16" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      // beds — hoed rows, count by tokens
      const beds = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < beds; b++) {
        const by = floorY - 4 - b * 4;
        g += `<line x1="${x - bW * .13}" y1="${by}" x2="${x + bW * .37}" y2="${by}" stroke="${b === beds - 1 && r.err ? "var(--red)" : "#8a6848"}" stroke-width="1.4"/>`;
        // plants in the bed
        for (let p = 0; p < 5; p++) {
          const px = x - bW * .1 + p * bW * .11;
          g += `<circle cx="${px}" cy="${by - 2}" r="1.2" fill="${b === beds - 1 && p === 4 && r.err ? "var(--red)" : green}" stroke="${r.col}" stroke-width=".3"/>`;
        }
      }
      // a fence — a wattle edge
      for (let f = 0; f < 4; f++) {
        g += `<line x1="${x - bW * .16 + f * bW * .18}" y1="${floorY - 16}" x2="${x - bW * .16 + f * bW * .18}" y2="${floorY - 22}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      g += `<line x1="${x - bW * .16}" y1="${floorY - 19}" x2="${x + bW * .4}" y2="${floorY - 19}" stroke="${r.col}" stroke-width=".5"/>`;
      // a gate — in the fence
      g += `<rect x="${x + bW * .2}" y="${floorY - 16}" width="6" height="16" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .2}" y1="${floorY - 12}" x2="${x + bW * .26}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      // a bee skep — a hive by the cot
      g += `<ellipse cx="${x - bW * .46}" cy="${floorY - 4}" rx="5" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .5} ${floorY - 6} h 8 M ${x - bW * .5} ${floorY - 4} h 8" stroke="${r.col}" stroke-width=".4" fill="none"/>`;
      g += `<ellipse cx="${x - bW * .46}" cy="${floorY - 6}" rx="1" ry=".6" fill="var(--card-2)"/>`;
      // a hoe — stuck in the plot
      g += `<line x1="${x + bW * .3}" y1="${floorY - 16}" x2="${x + bW * .33}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x + bW * .31}" y="${floorY - 6}" width="6" height="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;
      // a kale basket — by the gate
      g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 3}" rx="5" ry="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .42}" cy="${floorY - 5}" r="1.4" fill="${green}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<circle cx="${x + bW * .46}" cy="${floorY - 5}" r="1.4" fill="${green}" stroke="${r.col}" stroke-width=".4"/>`;

      // cottar hoeing for live sessions — figure bent in the plot
      if (r.live) {
        g += `<g class="cot-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .06} ${floorY - 28})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1" transform="rotate(18)"/>
          <line x1="4" y1="7" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
          <rect x="9" y="12" width="4" height="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>
        </g>`;
      }
      // blighted row — a brown bed on errors
      if (r.err) g += `<line x1="${x - bW * .13}" y1="${floorY - 4 - (beds - 1) * 4}" x2="${x + bW * .37}" y2="${floorY - 4 - (beds - 1) * 4}" stroke="var(--red)" stroke-width="1.4" opacity=".6"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cot-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cot-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "园圃", eyebrow: "PROVIDER COTTAR", render };
})();
