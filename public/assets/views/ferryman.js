/* ------------------------------------------------------------------ ferryman
 * Ferryman view — a row of chain ferries, one per provider.
 * Passengers aboard the punt = tokens; the ferryman hauling
 * the chain for live sessions; a foul chain marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ferryman";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .8;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fry-empty">暂无渡船</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the river — water band, bank lips top and bottom
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 7; w++) {
      g += `<path d="M ${w * W / 7 + 14} ${waterY + 6 + (w % 2) * 5} q 9 -3 18 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }
    g += `<rect y="${waterY - 4}" width="${W}" height="4" fill="var(--card-3)" opacity=".7"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const hull = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a5a" : "#4a4438";
      const bW = seg * .48;
      const ferryY = waterY + 4;
      // the chain — a sagging line across the reach
      g += `<path d="M ${x - bW * .6} ${waterY - 2} Q ${x} ${waterY + 10} ${x + bW * .6} ${waterY - 2}" fill="none" stroke="${r.col}" stroke-width=".8" stroke-dasharray="3 2" opacity=".7"/>`;
      // landing posts at each bank
      g += `<line x1="${x - bW * .6}" y1="${waterY - 4}" x2="${x - bW * .6}" y2="${waterY - 16}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + bW * .6}" y1="${waterY - 4}" x2="${x + bW * .6}" y2="${waterY - 16}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the punt — a flat deck ferry, mid-stream
      g += `<path d="M ${x - bW * .3} ${ferryY - 4} L ${x - bW * .24} ${ferryY + 3} L ${x + bW * .24} ${ferryY + 3} L ${x + bW * .3} ${ferryY - 4} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.3"/>`;
      // deck strakes
      for (let s = 0; s < 3; s++) {
        g += `<line x1="${x - bW * .26 + s * 2}" y1="${ferryY - 3 + s * 2}" x2="${x + bW * .26 - s * 2}" y2="${ferryY - 3 + s * 2}" stroke="${r.col}" stroke-width=".4" opacity=".5"/>`;
      }
      // waterline
      g += `<line x1="${x - bW * .32}" y1="${ferryY}" x2="${x + bW * .32}" y2="${ferryY}" stroke="#587888" stroke-width=".8" opacity=".6"/>`;
      // passengers aboard — small heads, count by tokens
      const pax = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pax; p++) {
        const px = x - bW * .18 + p * bW * .12;
        g += `<circle cx="${px}" cy="${ferryY - 8}" r="2.4" fill="${p === 0 && r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<rect x="${px - 2.4}" y="${ferryY - 6}" width="4.8" height="3" fill="${p === 0 && r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a cargo bundle and a bicycle on the deck
      g += `<rect x="${x + bW * .08}" y="${ferryY - 8}" width="6" height="5" rx="1" fill="${r.err ? "var(--red)" : "#a08048"}" stroke="${r.col}" stroke-width=".5"/>`;
      // the ferryman's paddle/chain horn
      g += `<line x1="${x - bW * .32}" y1="${ferryY - 10}" x2="${x - bW * .38}" y2="${ferryY - 18}" stroke="${r.col}" stroke-width="1.1"/>`;
      // ferryman hauling the chain for live sessions
      if (r.live) {
        g += `<g class="fry-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .24} ${ferryY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // foul chain — a snagged loop dragging on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${ferryY + 4} q 6 4 10 1" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="fry-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fry-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "渡船", eyebrow: "PROVIDER FERRYMAN", render };
})();
