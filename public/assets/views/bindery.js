/* ------------------------------------------------------------------- bindery
 * Bindery view — a row of sewing frames, one per provider.
 * Quires sewn on the cords = tokens; a sewer stitching for
 * live sessions; a dropped gathering marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bindery";
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
    if (!rows.length) { host.innerHTML = `<div class="qb-empty">暂无装订坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bindery floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const paper = r.err ? "#e06048" : "#e8e0d0";
      const frameW = seg * .5;
      const frameTop = floorY - 46;
      // sewing frame — two posts with a crossbar and hanging cords
      g += `<line x1="${x - frameW * .4}" y1="${floorY}" x2="${x - frameW * .4}" y2="${frameTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + frameW * .4}" y1="${floorY}" x2="${x + frameW * .4}" y2="${frameTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x - frameW * .44}" y1="${frameTop}" x2="${x + frameW * .44}" y2="${frameTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      // cords hanging from the bar
      for (let c = 0; c < 3; c++) {
        const cx = x - frameW * .24 + c * (frameW * .24);
        g += `<line x1="${cx}" y1="${frameTop}" x2="${cx}" y2="${floorY - 10}" stroke="${r.col}" stroke-width="1" opacity=".8"/>`;
      }
      // quires sewn on — stacked signatures, count by tokens
      const quires = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let q = 0; q < quires; q++) {
        const qy = floorY - 12 - q * 6;
        g += `<rect x="${x - frameW * .3}" y="${qy}" width="${frameW * .6}" height="5" rx="1" fill="${q === 0 && r.err ? "var(--red)" : paper}" stroke="${r.col}" stroke-width=".7"/>`;
        // stitch marks round the cords
        g += `<circle cx="${x - frameW * .12 + q}" cy="${qy + 2.5}" r=".9" fill="${r.col}"/>`;
      }
      // bound books stacked beside
      const books = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let b = 0; b < books; b++) {
        g += `<rect x="${x + frameW * .44 + 2}" y="${floorY - 6 - b * 7}" width="10" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<line x1="${x + frameW * .44 + 2}" y1="${floorY - 3 - b * 7}" x2="${x + frameW * .44 + 12}" y2="${floorY - 3 - b * 7}" stroke="var(--line)" stroke-width=".6"/>`;
      }
      // sewer stitching for live sessions
      if (r.live) {
        g += `<g class="qb-sewer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .44 - 8} ${floorY - 22})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // dropped gathering — spilled leaves on errors
      if (r.err) g += `<path d="M ${x - frameW * .1} ${floorY - 3} l 5 -2 l 4 3" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="qb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="qb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "装订坊", eyebrow: "PROVIDER BINDERY", render };
})();
