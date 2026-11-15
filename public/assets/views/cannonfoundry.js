/* ------------------------------------------------------------- cannonfoundry
 * Cannonfoundry view — a row of boring mills, one per provider.
 * Cannons bored and set on proofs = tokens; a founder working
 * the mandrel for live sessions; a honeycomb marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cannonfoundry";
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
    if (!rows.length) { host.innerHTML = `<div class="cf-empty">暂无铸炮坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // foundry floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bronze = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#98804a";
      const millW = seg * .5;
      const millY = floorY - 30;
      // the boring mill — a vertical headstock over a table
      g += `<rect x="${x - millW * .18}" y="${millY - 12}" width="${millW * .36}" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - millW * .18}" y1="${millY}" x2="${x - millW * .18}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + millW * .18}" y1="${millY}" x2="${x + millW * .18}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the boring bar — a vertical rod with a cutter
      g += `<line x1="${x}" y1="${millY - 12}" x2="${x}" y2="${millY + 10}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<rect x="${x - 2}" y="${millY + 8}" width="4" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // the cannon — a barrel on the table below
      g += `<path d="M ${x - millW * .16} ${floorY - 10} l ${millW * .32} 0 l 0 6 l -${millW * .32} 0 z" fill="${bronze}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x - millW * .16}" cy="${floorY - 7}" rx="3" ry="5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // cannonballs stacked beside — proofs by tokens
      const balls = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < balls; b++) {
        g += `<circle cx="${x + millW * .28 + b * 5}" cy="${floorY - 5 - b * 2}" r="2.5" fill="${bronze}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // honeycomb — a flaw mark on the casting on errors
      if (r.err) g += `<path d="M ${x - millW * .05} ${floorY - 12} q 6 -4 12 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      // founder at the mandrel for live sessions — figure with a lever
      if (r.live) {
        g += `<g class="cf-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - millW * .38} ${millY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="16" y2="2" stroke="${r.col}" stroke-width="1.3"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cf-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铸炮坊", eyebrow: "PROVIDER CANNONFOUNDRY", render };
})();
