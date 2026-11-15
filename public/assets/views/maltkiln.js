/* ------------------------------------------------------------------ maltkiln
 * Maltkiln view — a row of kiln beds, one per provider. Malt
 * shovelled off the bed = tokens; a maltster turning the bed
 * for live sessions; a scorched heap marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "maltkiln";
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
    if (!rows.length) { host.innerHTML = `<div class="mk-empty">暂无焙麦窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // kiln-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b868" : "#b09048";
      const bedY = floorY - 20;
      const bedW = seg * .55;
      // kiln bed — a tiled floor on a furnace plinth
      g += `<rect x="${x - bedW / 2}" y="${bedY}" width="${bedW}" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // furnace glow under the bed
      g += `<rect x="${x - bedW * .3}" y="${bedY + 14}" width="${bedW * .6}" height="4" rx="2" fill="var(--amber)" opacity=".7"/>`;
      // malt heap on the bed — pile by tokens
      const heapW = bedW * .4 + (r.tok / maxTok) * bedW * .2;
      g += `<path d="M ${x - heapW / 2} ${bedY} q ${heapW * .5} -${10 + (r.tok / maxTok) * 8} ${heapW} 0 Z" fill="${r.err ? "var(--red)" : tint}" stroke="${r.col}" stroke-width=".9" opacity=".9"/>`;
      // grain texture — dots in the heap
      for (let d = 0; d < 4; d++) {
        g += `<circle cx="${x - heapW * .2 + d * (heapW * .15)}" cy="${bedY - 3}" r="1" fill="var(--card-2)" opacity=".7"/>`;
      }
      // shovelled malt beside — a pile by the bed
      const pile = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let p = 0; p < pile; p++) {
        g += `<path d="M ${x + bedW / 2 + 4 + p * 8} ${floorY} q 4 -6 8 0 Z" fill="${tint}" opacity=".8"/>`;
      }
      // maltster turning the bed for live sessions
      if (r.live) {
        g += `<g class="mk-ster" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bedW / 2 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="0" stroke="${r.col}" stroke-width="1.2"/>
          <rect x="12" y="-3" width="5" height="3" fill="${tint}"/>
        </g>`;
      }
      // scorched heap — a dark crust on errors
      if (r.err) g += `<path d="M ${x - heapW * .2} ${bedY - 4} l 4 -4 l 3 5" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "焙麦窑", eyebrow: "PROVIDER MALTKILN", render };
})();
