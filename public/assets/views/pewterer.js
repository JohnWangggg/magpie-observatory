/* ------------------------------------------------------------------ pewterer
 * Pewterer view — a row of crucible stands, one per provider.
 * Flagons cast from the melt = tokens; a pewterer pouring
 * for live sessions; a starved ladle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pewterer";
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
    if (!rows.length) { host.innerHTML = `<div class="pt-empty">暂无白镴坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // pewter-shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pewter = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0d8e0" : "#98a0b0";
      const standW = seg * .4;
      const standY = floorY - 26;
      // the stand — a tripod holding the crucible
      g += `<line x1="${x - standW * .28}" y1="${floorY}" x2="${x}" y2="${standY + 8}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + standW * .28}" y1="${floorY}" x2="${x}" y2="${standY + 8}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - standW * .14}" y1="${floorY - 8}" x2="${x + standW * .14}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the crucible — a pot with a pouring lip
      g += `<path d="M ${x - standW * .14} ${standY + 8} l 0 -10 l ${standW * .28} 0 l 0 10 z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x + standW * .14} ${standY - 2} q 6 -4 8 2" stroke="${pewter}" stroke-width="1.6" fill="none"/>`;
      // melt sheen — a surface line on the crucible
      g += `<ellipse cx="${x}" cy="${standY - 2}" rx="${standW * .1}" ry="2.5" fill="${pewter}" opacity=".7"/>`;
      // flagons cast on the shelf — tankards by tokens
      const flagons = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < flagons; f++) {
        const fx = x - standW * .32 + f * 9;
        g += `<path d="M ${fx} ${floorY - 6} l 0 -8 l 6 -2 l 0 8 l -2 2 z" fill="${f === 0 && r.err ? "var(--red)" : pewter}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // pewterer pouring for live sessions — figure with a ladle
      if (r.live) {
        g += `<g class="pt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - standW * .4} ${standY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="6" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="14" cy="7" r="1.6" fill="none" stroke="${r.col}" stroke-width=".9"/>
        </g>`;
      }
      // starved ladle — a dry lip on the crucible on errors
      if (r.err) g += `<ellipse cx="${x + standW * .2}" cy="${standY}" rx="3" ry="2" fill="none" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "白镴坊", eyebrow: "PROVIDER PEWTERER", render };
})();
