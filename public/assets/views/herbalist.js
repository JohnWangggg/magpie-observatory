/* ----------------------------------------------------------------- herbalist
 * Herbalist view — a row of drying racks, one per provider.
 * Herb bundles hanging to dry = tokens; a herbalist tying
 * bundles for live sessions; a withered bunch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "herbalist";
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
    if (!rows.length) { host.innerHTML = `<div class="hl-empty">暂无草药坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const herb = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#78a058" : "#486838";
      const rW = seg * .4;
      const rTop = floorY - 46;
      // the drying rack — two posts and a line
      g += `<line x1="${x - rW / 2}" y1="${floorY}" x2="${x - rW / 2}" y2="${rTop}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + rW / 2}" y1="${floorY}" x2="${x + rW / 2}" y2="${rTop}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - rW * .52}" y1="${rTop + 4}" x2="${x + rW * .52}" y2="${rTop + 4}" stroke="${r.col}" stroke-width="1"/>`;
      // hanging herb bundles — leafy clusters, count by tokens
      const bundles = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bundles; b++) {
        const bx = x - rW * .38 + b * rW * .25;
        g += `<line x1="${bx}" y1="${rTop + 4}" x2="${bx}" y2="${rTop + 8}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<path d="M ${bx} ${rTop + 8} q -4 4 -3 12 q 3 8 3 12 q 0 -4 3 -12 q 1 -8 -3 -12" fill="${b === 0 && r.err ? "var(--red)" : herb}" opacity=".85" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<path d="M ${bx - 3} ${rTop + 12} q 3 2 6 0" fill="none" stroke="${r.col}" stroke-width=".5" opacity=".6"/>`;
      }
      // the sorting table below — a bench with fresh cuttings
      g += `<rect x="${x - rW * .4}" y="${floorY - 12}" width="${rW * .8}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - rW * .36}" y1="${floorY - 8}" x2="${x - rW * .36}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + rW * .36}" y1="${floorY - 8}" x2="${x + rW * .36}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      // cut stems on the table
      for (let c = 0; c < 3; c++) {
        g += `<path d="M ${x - rW * .3 + c * rW * .22} ${floorY - 12} q 4 -4 8 -3" fill="none" stroke="${c === 0 && r.err ? "var(--red)" : herb}" stroke-width="1"/>`;
        g += `<ellipse cx="${x - rW * .3 + c * rW * .22 + 8}" cy="${floorY - 14}" rx="2.2" ry="1.4" fill="${c === 0 && r.err ? "var(--red)" : herb}"/>`;
      }
      // a mortar of pounded herbs beside
      g += `<path d="M ${x + rW * .56} ${floorY - 8} q 4 7 8 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<ellipse cx="${x + rW * .56 + 4}" cy="${floorY - 7}" rx="3" ry="1.4" fill="${herb}" opacity=".7"/>`;
      // herbalist tying for live sessions
      if (r.live) {
        g += `<g class="hl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - rW * .58} ${rTop - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="13" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // withered bunch — a drooping dead bundle on errors
      if (r.err) g += `<path d="M ${x + rW * .4} ${rTop + 8} q 4 5 2 12" stroke="var(--red)" stroke-width="1.2" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草药坊", eyebrow: "PROVIDER HERBALIST", render };
})();
