/* ------------------------------------------------------------------ tinsmith
 * Tinsmith view — a row of roll stands, one per provider.
 * Pots raised from the sheet = tokens; a tinner planishing
 * for live sessions; a split seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tinsmith";
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
    if (!rows.length) { host.innerHTML = `<div class="ts-empty">暂无锡器坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // tinshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tin = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8d0e0" : "#8890a0";
      const standW = seg * .45;
      const standY = floorY - 28;
      // the roll stand — a rack holding a sheet coil
      g += `<line x1="${x - standW / 2}" y1="${floorY}" x2="${x - standW / 2}" y2="${standY + 6}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + standW / 2}" y1="${floorY}" x2="${x + standW / 2}" y2="${standY + 6}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - standW / 2}" y1="${standY + 6}" x2="${x + standW / 2}" y2="${standY + 6}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the coil — a rolled tinplate sheet
      g += `<ellipse cx="${x}" cy="${standY}" rx="${standW * .18}" ry="${standW * .1}" fill="${tin}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<ellipse cx="${x}" cy="${standY}" rx="${standW * .08}" ry="${standW * .04}" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // sheet feed — a flat lead running to the stake
      g += `<line x1="${x + standW * .12}" y1="${standY + 6}" x2="${x + standW * .3}" y2="${standY + 18}" stroke="${tin}" stroke-width="1.4" opacity=".8"/>`;
      // the stake — an anvil horn for forming
      g += `<path d="M ${x + standW * .3} ${floorY - 4} l 4 -14 l 4 14 z" fill="${tin}" stroke="${r.col}" stroke-width="1"/>`;
      // pots raised on the stake — cylinders by tokens
      const pots = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pots; p++) {
        const px = x - standW * .3 + p * 10;
        g += `<rect x="${px}" y="${floorY - 8 - p * 2}" width="8" height="8" rx="1" fill="${p === 0 && r.err ? "var(--red)" : tin}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // tinner planishing for live sessions — figure with a small hammer
      if (r.live) {
        g += `<g class="ts-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - standW * .42} ${standY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split seam — a gap on the pot edge on errors
      if (r.err) g += `<line x1="${x - standW * .26}" y1="${floorY - 10}" x2="${x - standW * .22}" y2="${floorY - 4}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ts-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ts-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锡器坊", eyebrow: "PROVIDER TINSMITH", render };
})();
