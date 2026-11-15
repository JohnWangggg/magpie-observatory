/* ----------------------------------------------------------------- pressroom
 * Pressroom view — a row of common presses, one per provider.
 * Pulled sheets on the tympan = tokens; a pressman hauling the
 * bar for live sessions; a smudged pull marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pressroom";
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
    if (!rows.length) { host.innerHTML = `<div class="ps-empty">暂无印刷坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // press-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ink = "#181818";
      const pressW = seg * .55;
      const bedY = floorY - 20;
      // the press — two cheeks carrying a spindle + bed
      g += `<line x1="${x - pressW * .32}" y1="${bedY}" x2="${x - pressW * .32}" y2="${bedY - 24}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x + pressW * .32}" y1="${bedY}" x2="${x + pressW * .32}" y2="${bedY - 24}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x - pressW * .36}" y1="${bedY - 24}" x2="${x + pressW * .36}" y2="${bedY - 24}" stroke="${r.col}" stroke-width="2"/>`;
      // spindle + platen
      g += `<line x1="${x}" y1="${bedY - 24}" x2="${x}" y2="${bedY - 6}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<rect x="${x - 8}" y="${bedY - 6}" width="16" height="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // the forme on the bed — a chase of type
      g += `<rect x="${x - pressW * .3}" y="${bedY - 3}" width="${pressW * .6}" height="3" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let t = 0; t < 4; t++) g += `<line x1="${x - pressW * .22 + t * (pressW * .14)}" y1="${bedY - 3}" x2="${x - pressW * .22 + t * (pressW * .14)}" y2="${bedY}" stroke="${ink}" stroke-width=".8"/>`;
      // pulled sheets stacked beside — count by tokens
      const pulls = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pulls; p++) {
        g += `<rect x="${x + pressW * .38}" y="${floorY - 5 - p * 4}" width="12" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${x + pressW * .38 + 2}" y1="${floorY - 4 - p * 4}" x2="${x + pressW * .38 + 10}" y2="${floorY - 4 - p * 4}" stroke="${ink}" stroke-width=".5"/>`;
      }
      // pressman hauling the bar for live sessions
      if (r.live) {
        g += `<g class="ps-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pressW * .36 - 8} ${bedY - 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="2" x2="16" y2="-4" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // smudged pull — an inked sheet on errors
      if (r.err) g += `<rect x="${x + pressW * .38}" y="${floorY - 5}" width="12" height="4" fill="var(--red)" opacity=".6"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ps-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ps-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "印刷坊", eyebrow: "PROVIDER PRESSROOM", render };
})();
