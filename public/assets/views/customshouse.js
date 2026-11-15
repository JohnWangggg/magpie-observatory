/* ------------------------------------------------------------- customshouse
 * Customshouse view — a row of customs houses, one per provider.
 * Sealed bales on the bonded floor = tokens; an officer
 * stamping declarations for live sessions; a seized
 * bale marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "customshouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="csh-empty">暂无关楼</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bonded floor — a stone quay inside
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .46;
      const wall = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      const roofY = floorY - 34;
      // the custom house — a columned front with a pediment
      g += `<rect x="${x - bW * .38}" y="${roofY}" width="${bW * .76}" height="${floorY - roofY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // pediment — a shallow triangle with a crown or eagle
      g += `<path d="M ${x - bW * .42} ${roofY} L ${x} ${roofY - 14} L ${x + bW * .42} ${roofY} Z" fill="${r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width="1.2"/>`;
      // columns — two flanking a door
      g += `<rect x="${x - bW * .32}" y="${roofY + 8}" width="6" height="${floorY - roofY - 8}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .26}" y="${roofY + 8}" width="6" height="${floorY - roofY - 8}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // a door with a stamp seal
      g += `<rect x="${x - 6}" y="${floorY - 14}" width="12" height="14" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x}" cy="${floorY - 7}" r="2" fill="${r.err ? "var(--red)" : r.col}"/>`;
      // sealed bales — crates with rope and wax seals
      const bales = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bales; b++) {
        const bx = x - bW * .3 + b * bW * .2;
        g += `<rect x="${bx - 7}" y="${floorY - 10}" width="14" height="9" rx="1" fill="${b === 0 && r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${bx - 7}" y1="${floorY - 5.5}" x2="${bx + 7}" y2="${floorY - 5.5}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${bx}" cy="${floorY - 7}" r="1.6" fill="${r.err ? "var(--red)" : r.col}"/>`;
      }
      // a weighing scale beside the bales
      g += `<line x1="${x + bW * .3}" y1="${floorY - 16}" x2="${x + bW * .3}" y2="${floorY - 4}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .24}" y1="${floorY - 16}" x2="${x + bW * .36}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .24}" cy="${floorY - 13}" r="2.2" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${floorY - 13}" r="2.2" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      // officer stamping for live sessions — figure with a stamp
      if (r.live) {
        g += `<g class="csh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
          <rect x="9" y="10" width="4" height="3" fill="${r.col}"/>
        </g>`;
      }
      // seized bale — a chain across a crate on errors
      if (r.err) {
        g += `<line x1="${x - bW * .3}" y1="${floorY - 10}" x2="${x - bW * .1}" y2="${floorY}" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
        g += `<line x1="${x - bW * .1}" y1="${floorY - 10}" x2="${x - bW * .3}" y2="${floorY}" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      }
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="csh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="csh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "关楼", eyebrow: "PROVIDER CUSTOMSHOUSE", render };
})();
