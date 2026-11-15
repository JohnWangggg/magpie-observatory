/* ------------------------------------------------------------------ sailmaker
 * Sailmaker view — a row of cutting floors, one per provider.
 * Cloths seamed into the sail = tokens; a sailmaker palming
 * for live sessions; a torn seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sailmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="slm-empty">暂无帆匠坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sail-loft floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const duck = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8e4d8" : "#b8b0a0";
      const floorW = seg * .52;
      const loftY = floorY - 28;
      // the loft floor — a planked cutting area
      g += `<rect x="${x - floorW / 2}" y="${loftY}" width="${floorW}" height="${floorY - loftY}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      for (let p = 0; p < 3; p++) {
        g += `<line x1="${x - floorW / 2}" y1="${loftY + 6 + p * 7}" x2="${x + floorW / 2}" y2="${loftY + 6 + p * 7}" stroke="${r.col}" stroke-width=".4" opacity=".4"/>`;
      }
      // the sail — a panel seamed on the floor, count by tokens
      const cloths = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      const sailW = floorW * .6;
      const sailX = x - sailW / 2;
      g += `<path d="M ${sailX} ${loftY + 4} L ${sailX + sailW} ${loftY + 6} L ${sailX + sailW - 8} ${floorY - 8} L ${sailX + 4} ${floorY - 10} Z" fill="${duck}" stroke="${r.col}" stroke-width="1"/>`;
      // seams — lines down the sail
      for (let s = 1; s <= cloths; s++) {
        const sx = sailX + s * sailW / (cloths + 1);
        g += `<line x1="${sx}" y1="${loftY + 5}" x2="${sx - 2}" y2="${floorY - 9}" stroke="${s === 1 && r.err ? "var(--red)" : r.col}" stroke-width=".6" opacity=".6"/>`;
      }
      // the boltrope — a rope edge along the foot
      g += `<path d="M ${sailX + 4} ${floorY - 10} L ${sailX + sailW - 8} ${floorY - 8}" stroke="${r.col}" stroke-width="1.4"/>`;
      // cringles — loops at the corners
      g += `<circle cx="${sailX + 4}" cy="${floorY - 10}" r="1.5" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${sailX + sailW - 8}" cy="${floorY - 8}" r="1.5" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // the palm — a sewing palm beside the sail
      g += `<ellipse cx="${x + floorW * .44}" cy="${floorY - 12}" rx="3" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // canvas bolts — rolls stacked beside, count by tokens
      const bolts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bolts; b++) {
        g += `<ellipse cx="${x - floorW * .44 + b * 4}" cy="${floorY - 8 - b * 3}" rx="5" ry="3" fill="${b === 0 && r.err ? "var(--red)" : duck}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // sailmaker palming for live sessions — kneeling figure stitching
      if (r.live) {
        g += `<g class="slm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + floorW * .3} ${loftY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="8" x2="-13" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // torn seam — a rip across the cloth on errors
      if (r.err) g += `<path d="M ${sailX + sailW * .3} ${loftY + 8} l 8 12" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="slm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="slm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "帆匠坊", eyebrow: "PROVIDER SAILMAKER", render };
})();
