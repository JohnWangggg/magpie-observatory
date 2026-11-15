/* ------------------------------------------------------------------- farrier
 * Farrier view — a row of bellows stands, one per provider.
 * Shoes nailed to the rack = tokens; a farrier clinching for
 * live sessions; a clenched miss marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "farrier";
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
    if (!rows.length) { host.innerHTML = `<div class="fr-empty">暂无蹄铁坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // forge floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8b8b8" : "#787878";
      const standW = seg * .45;
      const standY = floorY - 30;
      // the bellows — two boards on a frame
      g += `<path d="M ${x - standW * .3} ${standY + 8} l 0 -8 l ${standW * .3} -6 l ${standW * .3} 6 l 0 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - standW * .3}" y1="${standY + 8}" x2="${x - standW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + standW * .3}" y1="${standY + 8}" x2="${x + standW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // nozzle — a pipe to the hearth
      g += `<line x1="${x + standW * .1}" y1="${standY + 4}" x2="${x + standW * .28}" y2="${standY + 10}" stroke="${r.col}" stroke-width="1.4"/>`;
      // the anvil — a block beside the bellows
      g += `<rect x="${x - standW * .32}" y="${floorY - 8}" width="${standW * .2}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - standW * .32 + 2}" y="${floorY - 12}" width="${standW * .2 - 4}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // shoes hung on the rack — horseshoes by tokens
      const shoes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < shoes; s++) {
        const sx = x + standW * .12 + s * 8;
        g += `<path d="M ${sx} ${floorY - 6} a 4 4 0 0 1 8 0 l -2 2 a 4 4 0 0 0 -4 0 z" fill="${s === 0 && r.err ? "var(--red)" : iron}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // hoof — a leg on the shoeing stock
      g += `<path d="M ${x - standW * .1} ${floorY - 4} q 4 -6 8 0" stroke="${iron}" stroke-width="1.4" fill="none"/>`;
      // farrier clinching for live sessions — figure with a hammer
      if (r.live) {
        g += `<g class="fr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - standW * .44} ${standY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="3" stroke="${r.col}" stroke-width="1.3"/>
        </g>`;
      }
      // clenched miss — a bent nail on the anvil on errors
      if (r.err) g += `<line x1="${x - standW * .22}" y1="${floorY - 10}" x2="${x - standW * .18}" y2="${floorY - 6}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="fr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蹄铁坊", eyebrow: "PROVIDER FARRIER", render };
})();
