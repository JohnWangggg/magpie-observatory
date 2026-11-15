/* ---------------------------------------------------------------- lampwright
 * Lampwright view — a row of oil-lamp benches, one per provider.
 * Finished lamps burning on the shelf = tokens; a lampwright
 * trimming a wick for live sessions; a smoked chimney marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lampwright";
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
    if (!rows.length) { host.innerHTML = `<div class="lw-empty">暂无灯具坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const glow = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0c060" : "#a07830";
      const bW = seg * .38;
      const bTop = floorY - 36;
      // the workbench — a table with a shelf above
      g += `<rect x="${x - bW / 2}" y="${floorY - 10}" width="${bW}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x - bW * .42}" y1="${floorY - 6}" x2="${x - bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .42}" y1="${floorY - 6}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW / 2}" y1="${bTop}" x2="${x + bW / 2}" y2="${bTop}" stroke="${r.col}" stroke-width="1.4"/>`;
      // the master lamp on the bench — font, burner, chimney
      g += `<ellipse cx="${x}" cy="${floorY - 14}" rx="7" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<rect x="${x - 2}" y="${floorY - 22}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x - 3} ${floorY - 22} L ${x - 2} ${floorY - 30} L ${x + 2} ${floorY - 30} L ${x + 3} ${floorY - 22}" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // flame — sized by tokens
      const flH = 3 + r.tok / maxTok * 6;
      g += `<path d="M ${x} ${floorY - 22} q -2 -${flH * .5} 0 -${flH} q 2 ${flH * .5} 0 ${flH}" fill="${r.err ? "var(--red)" : glow}" opacity=".9"/>`;
      // finished lamps on the shelf, count by tokens
      const lamps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < lamps; l++) {
        const lx = x - bW * .35 + l * bW * .3;
        g += `<ellipse cx="${lx}" cy="${bTop - 4}" rx="4" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<circle cx="${lx}" cy="${bTop - 9}" r="1.6" fill="${l === 0 && r.err ? "var(--red)" : glow}"/>`;
      }
      // a wick spool and oil can beside the bench
      g += `<circle cx="${x - bW * .62}" cy="${floorY - 4}" r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x - bW * .62}" cy="${floorY - 4}" r="1.2" fill="${r.col}"/>`;
      g += `<path d="M ${x + bW * .58} ${floorY - 8} h 8 v 8 h -8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .58 + 6}" y1="${floorY - 8}" x2="${x + bW * .58 + 9}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".9"/>`;
      // lampwright trimming for live sessions
      if (r.live) {
        g += `<g class="lw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .55} ${bTop - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="13" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // smoked chimney — soot rising on errors
      if (r.err) {
        g += `<path d="M ${x + 4} ${floorY - 30} q 3 -5 1 -9" stroke="var(--red)" stroke-width="1.2" fill="none" opacity=".8"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯具坊", eyebrow: "PROVIDER LAMPWRIGHT", render };
})();
