/* -------------------------------------------------------------------- salter
 * Salter view — a row of powdering tubs, one per provider.
 * Fish laid in the brine = tokens; a salter packing
 * layers for live sessions; a spoiled catch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "salter";
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
    if (!rows.length) { host.innerHTML = `<div class="sa-empty">暂无腌坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const fish = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#98b8c8" : "#587078";
      const tW = seg * .36;
      const tY = floorY - 28;
      const tH = 24;
      // the powdering tub — a deep salt tub with hoops
      g += `<path d="M ${x - tW / 2} ${tY} L ${x - tW * .46} ${floorY - 2} L ${x + tW * .46} ${floorY - 2} L ${x + tW / 2} ${tY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // brine surface
      g += `<ellipse cx="${x}" cy="${tY + 4}" rx="${tW * .46}" ry="3.5" fill="${fish}" opacity=".5"/>`;
      // hoops
      g += `<path d="M ${x - tW * .48} ${tY + tH * .4} L ${x + tW * .48} ${tY + tH * .4}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      g += `<path d="M ${x - tW * .46} ${tY + tH * .75} L ${x + tW * .46} ${tY + tH * .75}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // fish in the tub — layered fish, count by tokens
      const fishN = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < fishN; f++) {
        const fy = tY + 2 + f * 4;
        g += `<path d="M ${x - tW * .3 + (f % 2) * 4} ${fy} q 8 -2 14 0 q -6 3 -14 0" fill="${f === 0 && r.err ? "var(--red)" : fish}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${x - tW * .28 + (f % 2) * 4}" cy="${fy - .6}" r=".6" fill="${r.col}"/>`;
        g += `<path d="M ${x - tW * .3 + (f % 2) * 4 + 14} ${fy} l 3 -2 l 0 4 z" fill="${f === 0 && r.err ? "var(--red)" : fish}"/>`;
      }
      // a salt scoop on the tub edge
      g += `<line x1="${x + tW * .4}" y1="${tY - 6}" x2="${x + tW * .5}" y2="${tY + 2}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x + tW * .4}" cy="${tY - 7}" rx="3" ry="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // salt sack beside
      g += `<path d="M ${x - tW * .75} ${floorY - 2} q -4 -12 2 -16 q 6 4 2 16 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<text x="${x - tW * .74}" y="${floorY - 6}" font-size="4" fill="${r.col}" text-anchor="middle">NaCl</text>`;
      // hanging fish to drain — on a line beside
      g += `<line x1="${x + tW * .62}" y1="${floorY}" x2="${x + tW * .62}" y2="${tY - 12}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + tW * .52}" y1="${tY - 8}" x2="${x + tW * .74}" y2="${tY - 8}" stroke="${r.col}" stroke-width=".9"/>`;
      for (let h = 0; h < 2; h++) {
        g += `<path d="M ${x + tW * .56 + h * tW * .14} ${tY - 7} q -2 6 0 11 q 2 -5 3 -11" fill="${h === 0 && r.err ? "var(--red)" : fish}" opacity=".8"/>`;
      }
      // salter packing for live sessions
      if (r.live) {
        g += `<g class="sa-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - tW * .6} ${tY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="13" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // spoiled catch — a belly-up fish on errors
      if (r.err) g += `<path d="M ${x + tW * .1} ${tY - 2} q 6 -3 10 0 q -4 3 -10 0" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sa-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "腌坊", eyebrow: "PROVIDER SALTER", render };
})();
