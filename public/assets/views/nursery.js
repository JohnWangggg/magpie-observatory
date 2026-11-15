/* ------------------------------------------------------------------- nursery
 * Nursery view — a row of seedbeds, one per provider.
 * Seedlings in the rows = tokens; a gardener tending
 * for live sessions; a wilted bed marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nursery";
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
    if (!rows.length) { host.innerHTML = `<div class="ny-empty">暂无苗圃</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // nursery ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const leaf = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68b050" : "#4a8040";
      const bedW = seg * .5;
      const bedY = floorY - 26;
      // the seedbed — a raised frame of soil
      g += `<rect x="${x - bedW / 2}" y="${bedY}" width="${bedW}" height="${floorY - bedY}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // soil line
      g += `<line x1="${x - bedW / 2}" y1="${bedY + 4}" x2="${x + bedW / 2}" y2="${bedY + 4}" stroke="${r.col}" stroke-width=".7" opacity=".5"/>`;
      // seedlings — rows of sprouts, count by tokens
      const sprouts = Math.min(8, Math.ceil(r.tok / maxTok * 8));
      for (let s = 0; s < sprouts; s++) {
        const sx = x - bedW * .4 + (s % 4) * bedW * .26;
        const sy = bedY + 8 + Math.floor(s / 4) * 8;
        // a sprout — stem + two leaves
        g += `<line x1="${sx}" y1="${sy + 5}" x2="${sx}" y2="${sy}" stroke="${s === 0 && r.err ? "var(--red)" : leaf}" stroke-width="1.1"/>`;
        g += `<path d="M ${sx} ${sy + 1} q -3 -1 -4 -4 M ${sx} ${sy + 1} q 3 -1 4 -4" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : leaf}" stroke-width=".9"/>`;
      }
      // the label stake — a tag in the bed
      g += `<line x1="${x + bedW * .42}" y1="${bedY + 4}" x2="${x + bedW * .42}" y2="${bedY - 6}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<rect x="${x + bedW * .42 - 3}" y="${bedY - 10}" width="7" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // the coldframe lid — a slanted glass cover on the bed
      g += `<line x1="${x - bedW * .5}" y1="${bedY + 2}" x2="${x - bedW * .3}" y2="${bedY - 8}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - bedW * .3}" y1="${bedY - 8}" x2="${x + bedW * .2}" y2="${bedY - 8}" stroke="${r.col}" stroke-width=".9"/>`;
      // gardener tending for live sessions — figure with a watering can
      if (r.live) {
        g += `<g class="ny-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bedW * .42} ${bedY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="11" y2="11" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="12" cy="12" r="1.5" fill="${leaf}"/>
        </g>`;
      }
      // wilted bed — a drooping sprout on errors
      if (r.err) g += `<path d="M ${x - 4} ${bedY + 8} q 4 2 0 6" fill="none" stroke="var(--red)" stroke-width="1.3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ny-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ny-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "苗圃", eyebrow: "PROVIDER NURSERY", render };
})();
