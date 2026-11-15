/* --------------------------------------------------------------- lockkeeper
 * Lockkeeper view — a row of canal locks, one per provider.
 * Boats rising in the chamber = tokens; a keeper winding
 * the paddles for live sessions; a fouled gate marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lockkeeper";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lkp-empty">暂无闸房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // canal bed
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const water = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a8ea8" : "#3a5a6c";
      const lW = seg * .46;
      const wallTop = waterY - 30;
      // lock walls — two stone cheeks
      g += `<rect x="${x - lW / 2}" y="${wallTop}" width="${lW * .14}" height="${H - wallTop}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x + lW * .36}" y="${wallTop}" width="${lW * .14}" height="${H - wallTop}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // coping stones
      g += `<line x1="${x - lW / 2}" y1="${wallTop + 4}" x2="${x - lW * .36}" y2="${wallTop + 4}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + lW * .36}" y1="${wallTop + 4}" x2="${x + lW * .5}" y2="${wallTop + 4}" stroke="${r.col}" stroke-width=".6"/>`;
      // mitre gates — a V pair closing the chamber
      g += `<line x1="${x - lW * .36}" y1="${wallTop + 6}" x2="${x}" y2="${waterY - 4}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + lW * .36}" y1="${wallTop + 6}" x2="${x}" y2="${waterY - 4}" stroke="${r.col}" stroke-width="1.6"/>`;
      // gate balance beams
      g += `<line x1="${x - lW * .36}" y1="${wallTop + 6}" x2="${x - lW * .5}" y2="${wallTop + 2}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + lW * .36}" y1="${wallTop + 6}" x2="${x + lW * .5}" y2="${wallTop + 2}" stroke="${r.col}" stroke-width="1"/>`;
      // chamber water — level inside, height by tokens
      const lvl = 4 + (r.tok / maxTok) * (waterY - wallTop - 12);
      g += `<rect x="${x - lW * .36}" y="${waterY - lvl}" width="${lW * .72}" height="${lvl}" fill="${r.err ? "var(--red)" : water}" opacity=".55"/>`;
      // paddle culvert — a small sluice with water pouring
      g += `<rect x="${x + lW * .4}" y="${wallTop + 10}" width="${lW * .06}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      if (r.tok > 0) g += `<path d="M ${x + lW * .43} ${wallTop + 20} q 0 6 -2 10" fill="none" stroke="${r.err ? "var(--red)" : water}" stroke-width="1.2" opacity=".7"/>`;
      // the boat in the chamber — a narrowboat floating at level
      const boatY = waterY - lvl;
      g += `<path d="M ${x - lW * .3} ${boatY - 4} L ${x - lW * .26} ${boatY} L ${x + lW * .26} ${boatY} L ${x + lW * .3} ${boatY - 4} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - lW * .1}" y="${boatY - 10}" width="${lW * .2}" height="6" rx="1" fill="${r.err ? "var(--red)" : water}" stroke="${r.col}" stroke-width=".6"/>`;
      // windlass on the gate beam — the crank
      g += `<line x1="${x + lW * .46}" y1="${wallTop + 2}" x2="${x + lW * .52}" y2="${wallTop - 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x + lW * .52}" cy="${wallTop - 5}" r="1.8" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      // bollards on the coping
      for (let b = 0; b < 2; b++) {
        g += `<path d="M ${x - lW * .44 + b * lW * .86} ${wallTop - 4} a 2.5 2.5 0 0 1 5 0 l 0 4 h -5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // lockkeeper winding for live sessions — figure at the windlass
      if (r.live) {
        g += `<g class="lkp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + lW * .56} ${wallTop - 16})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // fouled gate — a jammed timber on errors
      if (r.err) g += `<line x1="${x - lW * .3}" y1="${waterY - 8}" x2="${x + lW * .1}" y2="${waterY - 14}" stroke="var(--red)" stroke-width="1.6"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="lkp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lkp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "闸房", eyebrow: "PROVIDER LOCKKEEPER", render };
})();
