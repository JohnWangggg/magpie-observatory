/* --------------------------------------------------------------- pilothouse
 * Pilothouse view — a row of pilot stations, one per provider.
 * Cutters moored at the pier = tokens; a pilot reading
 * the tide board for live sessions; a fog-bell marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pilothouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="plt-empty">暂无引航</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the pier — a timber stage over water
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 7; w++) {
      g += `<path d="M ${w * W / 7 + 14} ${waterY + 6 + (w % 2) * 5} q 9 -3 18 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .46;
      const towerY = waterY - 30;
      const wall = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      // the pilot station — a raised look-out on stilts
      g += `<line x1="${x - bW * .28}" y1="${waterY}" x2="${x - bW * .28}" y2="${waterY + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .28}" y1="${waterY}" x2="${x + bW * .28}" y2="${waterY + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .34}" y="${towerY - 12}" width="${bW * .68}" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // a sloped roof and a look-out window
      g += `<path d="M ${x - bW * .38} ${towerY - 12} L ${x} ${towerY - 22} L ${x + bW * .38} ${towerY - 12} Z" fill="${r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .1}" y="${towerY - 10}" width="${bW * .2}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      // tide board on the wall
      g += `<rect x="${x - bW * .38}" y="${towerY + 4}" width="${bW * .16}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x - bW * .38}" y1="${towerY + 6 + t * 3}" x2="${x - bW * .22}" y2="${towerY + 6 + t * 3}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // signal balls on a mast — a yard with flags
      g += `<line x1="${x + bW * .3}" y1="${towerY - 12}" x2="${x + bW * .3}" y2="${towerY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .24}" y1="${towerY - 26}" x2="${x + bW * .36}" y2="${towerY - 26}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .3}" cy="${towerY - 24}" r="1.8" fill="${r.err ? "var(--red)" : r.col}"/>`;
      g += `<path d="M ${x + bW * .36} ${towerY - 26} l 6 -2 0 4 z" fill="${r.err ? "var(--red)" : r.col}"/>`;
      // cutters moored — small boats, count by tokens
      const cutters = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cutters; c++) {
        const cx = x - bW * .26 + c * bW * .26;
        const cy = waterY + 4;
        g += `<path d="M ${cx - 10} ${cy} Q ${cx - 12} ${cy + 5} ${cx} ${cy + 7} Q ${cx + 12} ${cy + 5} ${cx + 10} ${cy} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1"/>`;
        g += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 14}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<line x1="${cx - 6}" y1="${cy - 9}" x2="${cx + 6}" y2="${cy - 9}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a mooring bollard on the pier end
      g += `<path d="M ${x - bW * .4} ${waterY - 4} a 2.5 2.5 0 0 1 5 0 l 0 4 h -5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // pilot reading the tide board for live sessions
      if (r.live) {
        g += `<g class="plt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${towerY - 4})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="7" x2="-10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // fog-bell — a hanging bell under the eave on errors
      if (r.err) {
        g += `<path d="M ${x + bW * .2} ${towerY - 2} a 3 3 0 0 1 6 0 l 0 4 h -6 z" fill="var(--red)" opacity=".8"/>`;
        g += `<line x1="${x + bW * .23}" y1="${towerY - 2}" x2="${x + bW * .23}" y2="${towerY - 5}" stroke="var(--red)" stroke-width=".8"/>`;
      }
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="plt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="plt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "引航", eyebrow: "PROVIDER PILOTHOUSE", render };
})();
