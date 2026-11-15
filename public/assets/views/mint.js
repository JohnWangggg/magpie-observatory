/* ---------------------------------------------------------------------- mint
 * Mint view — a row of screw presses, one per provider.
 * Struck coins stacked on the table = tokens; a moneyer
 * swinging the arm for live sessions; a clipped coin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mint";
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
    if (!rows.length) { host.innerHTML = `<div class="mi-empty">暂无铸币坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const specie = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0c050" : "#908038";
      const pW = seg * .36;
      const pTop = floorY - 42;
      // the screw press — frame with a weighted arm
      g += `<rect x="${x - pW * .4}" y="${pTop + 14}" width="${pW * .8}" height="${floorY - pTop - 14}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // screw column
      g += `<rect x="${x - 3}" y="${pTop}" width="6" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the swinging arm — long bar with ball weights
      g += `<line x1="${x - pW * .55}" y1="${pTop + 4}" x2="${x + pW * .55}" y2="${pTop + 4}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<circle cx="${x - pW * .55}" cy="${pTop + 4}" r="3" fill="${r.col}"/>`;
      g += `<circle cx="${x + pW * .55}" cy="${pTop + 4}" r="3" fill="${r.col}"/>`;
      // the die box — lower die and collar
      g += `<rect x="${x - pW * .14}" y="${pTop + 20}" width="${pW * .28}" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // a blank on the die
      g += `<ellipse cx="${x}" cy="${pTop + 24}" rx="4" ry="2" fill="${r.err ? "var(--red)" : specie}"/>`;
      // struck coins — stacked on a side table, count by tokens
      g += `<line x1="${x + pW * .55}" y1="${floorY}" x2="${x + pW * .55}" y2="${floorY - 10}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + pW * .44}" y1="${floorY - 10}" x2="${x + pW * .68}" y2="${floorY - 10}" stroke="${r.col}" stroke-width="1.2"/>`;
      const coins = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < coins; c++) {
        g += `<ellipse cx="${x + pW * .56}" cy="${floorY - 12 - c * 3}" rx="6" ry="2.4" fill="${c === 0 && r.err ? "var(--red)" : specie}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a bag of blanks beside
      g += `<path d="M ${x - pW * .68} ${floorY - 2} q -4 -10 2 -14 q 6 4 2 14 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - pW * .68}" y1="${floorY - 14}" x2="${x - pW * .66}" y2="${floorY - 17}" stroke="${r.col}" stroke-width=".8"/>`;
      // moneyer swinging for live sessions
      if (r.live) {
        g += `<g class="mi-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pW * .62} ${pTop - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="12" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // clipped coin — a shaved edge on errors
      if (r.err) g += `<path d="M ${x + pW * .56} ${floorY - 15} q -4 2 -2 5" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mi-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mi-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铸币坊", eyebrow: "PROVIDER MINT", render };
})();
