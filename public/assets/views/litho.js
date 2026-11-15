/* ---------------------------------------------------------------------- litho
 * Litho view — a row of litho presses, one per provider.
 * Impressions pulled off the stone = tokens; a printer rolling
 * the ink for live sessions; a scummed pass marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "litho";
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
    if (!rows.length) { host.innerHTML = `<div class="li-empty">暂无石印坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // print-shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const stone = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8b8a8" : "#88887a";
      const pressW = seg * .5;
      const bedY = floorY - 20;
      // the press — a traveling bed under a scraper bar
      g += `<line x1="${x - pressW / 2}" y1="${bedY}" x2="${x + pressW / 2}" y2="${bedY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - pressW * .3}" y1="${bedY}" x2="${x - pressW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + pressW * .3}" y1="${bedY}" x2="${x + pressW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the scraper bar above
      g += `<rect x="${x - 4}" y="${bedY - 14}" width="8" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the stone on the bed — a slab with drawn marks
      g += `<rect x="${x - pressW * .24}" y="${bedY - 8}" width="${pressW * .48}" height="8" rx="1" fill="${stone}" stroke="${r.col}" stroke-width="1"/>`;
      // the greasy drawing on the stone — strokes by tokens
      const marks = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < marks; m++) {
        g += `<path d="M ${x - pressW * .16 + m * pressW * .1} ${bedY - 4} q 4 -3 8 0" stroke="${r.err && m === 0 ? "var(--red)" : "#303038"}" stroke-width="1.4" fill="none"/>`;
      }
      // pulled impressions — a paper stack beside the press
      const sheets = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < sheets; s++) {
        g += `<rect x="${x + pressW * .34}" y="${floorY - 5 - s * 4}" width="12" height="3" fill="#e8e4d8" stroke="${r.col}" stroke-width=".5" transform="rotate(4 ${x + pressW * .4} ${floorY})"/>`;
      }
      // ink roller — a cylinder resting on the stone's near end
      g += `<ellipse cx="${x - pressW * .3}" cy="${bedY - 12}" rx="4" ry="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // printer rolling the ink for live sessions — figure guiding the roller
      if (r.live) {
        g += `<g class="li-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pressW * .42} ${bedY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="9" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // scummed pass — a smear over the drawing on errors
      if (r.err) g += `<path d="M ${x - pressW * .18} ${bedY - 4} q ${pressW * .18} -4 ${pressW * .36} 0" stroke="var(--red)" stroke-width="1.8" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="li-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="li-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石印坊", eyebrow: "PROVIDER LITHO", render };
})();
