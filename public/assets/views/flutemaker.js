/* --------------------------------------------------------------- flutemaker
 * Flutemaker view — a row of woodwind benches, one per provider.
 * Bored flutes racked on the stand = tokens; a maker reaming
 * a bore for live sessions; a split joint marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "flutemaker";
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
    if (!rows.length) { host.innerHTML = `<div class="flm-empty">暂无笛坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const boxwood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8a860" : "#887048";
      const bW = seg * .4;
      const bTop = floorY - 28;
      // the lathe bench — a treadle lathe with a flute blank
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .44}" y1="${bTop + 5}" x2="${x - bW * .44}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + bW * .44}" y1="${bTop + 5}" x2="${x + bW * .44}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      // centres — headstock and tailstock
      g += `<rect x="${x - bW * .4}" y="${bTop - 6}" width="5" height="7" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .34}" y="${bTop - 6}" width="5" height="7" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // the flute on centres — a turned tube with finger holes
      g += `<line x1="${x - bW * .35}" y1="${bTop - 4}" x2="${x + bW * .34}" y2="${bTop - 4}" stroke="${boxwood}" stroke-width="2.6"/>`;
      for (let h = 0; h < 4; h++) {
        g += `<circle cx="${x - bW * .2 + h * bW * .14}" cy="${bTop - 4}" r=".9" fill="var(--card-3)"/>`;
      }
      // ring mounts on the joints
      g += `<line x1="${x - bW * .28}" y1="${bTop - 5.4}" x2="${x - bW * .28}" y2="${bTop - 2.6}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .26}" y1="${bTop - 5.4}" x2="${x + bW * .26}" y2="${bTop - 2.6}" stroke="${r.col}" stroke-width=".9"/>`;
      // the reamer — a boring rod entering the bore
      g += `<line x1="${x - bW * .34}" y1="${bTop - 4}" x2="${x - bW * .56}" y2="${bTop - 4}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x - bW * .57}" cy="${bTop - 4}" r="2.4" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // finished flutes — standing in a rack, count by tokens
      g += `<line x1="${x + bW * .62}" y1="${floorY}" x2="${x + bW * .62}" y2="${bTop - 16}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .5}" y1="${bTop - 10}" x2="${x + bW * .74}" y2="${bTop - 10}" stroke="${r.col}" stroke-width="1"/>`;
      const flutes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < flutes; f++) {
        const fx = x + bW * .53 + f * bW * .08;
        g += `<line x1="${fx}" y1="${bTop - 10}" x2="${fx}" y2="${floorY - 3}" stroke="${f === 0 && r.err ? "var(--red)" : boxwood}" stroke-width="2"/>`;
        g += `<line x1="${fx - 1}" y1="${bTop - 16}" x2="${fx + 1}" y2="${bTop - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // shavings below the lathe
      for (let s = 0; s < 3; s++) {
        g += `<path d="M ${x - bW * .2 + s * 6} ${floorY - 2} q 2 -3 4 0" fill="none" stroke="${boxwood}" stroke-width=".7" opacity=".6"/>`;
      }
      // flutemaker reaming for live sessions
      if (r.live) {
        g += `<g class="flm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .68} ${bTop - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="13" y2="8" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // split joint — a cracked section on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${bTop - 6} l 4 4" stroke="var(--red)" stroke-width="1.3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="flm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="flm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "笛坊", eyebrow: "PROVIDER FLUTEMAKER", render };
})();
