/* -------------------------------------------------------------- confectioner
 * Confectioner view — a row of sugar slabs, one per provider.
 * Comfits and sugar-work on the tray = tokens; a confectioner
 * pulling sugar for live sessions; a scorched pan marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "confectioner";
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
    if (!rows.length) { host.innerHTML = `<div class="cnf-empty">暂无糖果坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const sugar = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0c8d8" : "#987088";
      const sW = seg * .38;
      const sTop = floorY - 30;
      // the marble slab — a cool work slab on trestles
      g += `<rect x="${x - sW / 2}" y="${sTop}" width="${sW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - sW * .42}" y1="${sTop + 5}" x2="${x - sW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + sW * .42}" y1="${sTop + 5}" x2="${x + sW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      // a pulled-sugar ribbon on the slab — a glossy strand
      g += `<path d="M ${x - sW * .3} ${sTop - 3} q ${sW * .2} -6 ${sW * .4} -1" fill="none" stroke="${sugar}" stroke-width="2.4" stroke-linecap="round"/>`;
      g += `<path d="M ${x - sW * .28} ${sTop - 4} q ${sW * .2} -5 ${sW * .36} -1" fill="none" stroke="#ffffff" stroke-width=".7" opacity=".5"/>`;
      // comfits on a drying tray — little pearls, count by tokens
      g += `<rect x="${x + sW * .16}" y="${sTop - 8}" width="${sW * .3}" height="7" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      const comfits = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < comfits; c++) {
        g += `<circle cx="${x + sW * .19 + c * sW * .07}" cy="${sTop - 4.5}" r="1.8" fill="${c === 0 && r.err ? "var(--red)" : sugar}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a sugar-boiler pan on a stand
      g += `<path d="M ${x - sW * .66} ${floorY - 12} a 6 6 0 0 1 12 0 l -2 3 h -8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - sW * .66 + 6}" y1="${floorY - 14}" x2="${x - sW * .66 + 10}" y2="${floorY - 18}" stroke="${r.col}" stroke-width=".9"/>`;
      // a mould for sugar-work — a carved box
      g += `<rect x="${x - sW * .48}" y="${sTop - 6}" width="${sW * .16}" height="5" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x - sW * .4}" cy="${sTop - 3.5}" r="1.4" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      // confectioner pulling for live sessions — figure stretching sugar
      if (r.live) {
        g += `<g class="cnf-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - sW * .5} ${sTop - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="12" y2="8" stroke="${r.col}" stroke-width="1"/>
          <path d="M 12 8 q 4 1 6 -1" fill="none" stroke="${sugar}" stroke-width="1.2"/>
        </g>`;
      }
      // scorched pan — blackened sugar on errors
      if (r.err) g += `<ellipse cx="${x - sW * .66 + 6}" cy="${floorY - 11}" rx="4" ry="2" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cnf-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cnf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "糖果坊", eyebrow: "PROVIDER CONFECTIONER", render };
})();
