/* ------------------------------------------------------------------- horsegin
 * Horsegin view — a row of whim gins, one per provider.
 * Barrels wound up the shaft = tokens; a horse walking the
 * lever for live sessions; a snagged rope marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "horsegin";
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
    if (!rows.length) { host.innerHTML = `<div class="hg-empty">暂无绞盘坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // gin-yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const rope = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8b080" : "#98805a";
      const ginW = seg * .5;
      const ginY = floorY - 32;
      // the whim — a vertical drum on a frame
      g += `<line x1="${x - ginW * .2}" y1="${floorY}" x2="${x - ginW * .2}" y2="${ginY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + ginW * .2}" y1="${floorY}" x2="${x + ginW * .2}" y2="${ginY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - ginW * .2}" y1="${ginY}" x2="${x + ginW * .2}" y2="${ginY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the drum — a barrel on the frame
      g += `<ellipse cx="${x}" cy="${ginY - 4}" rx="${ginW * .14}" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - ginW * .14}" y="${ginY - 10}" width="${ginW * .28}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // the lever — a long arm off the drum
      g += `<line x1="${x + ginW * .14}" y1="${ginY - 7}" x2="${x + ginW * .42}" y2="${ginY - 14}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the rope — winding off the drum down the shaft
      g += `<line x1="${x - ginW * .14}" y1="${ginY - 7}" x2="${x - ginW * .34}" y2="${floorY - 6}" stroke="${rope}" stroke-width="1.4"/>`;
      // the shaft — a pit mouth
      g += `<ellipse cx="${x - ginW * .36}" cy="${floorY - 4}" rx="6" ry="2.5" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // barrels raised — stacked beside, count by tokens
      const barrels = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < barrels; b++) {
        const bx = x - ginW * .05 + b * 10;
        g += `<ellipse cx="${bx}" cy="${floorY - 8 - b * 2}" rx="4" ry="5" fill="${b === 0 && r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<line x1="${bx - 4}" y1="${floorY - 8 - b * 2}" x2="${bx + 4}" y2="${floorY - 8 - b * 2}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // horse walking the lever for live sessions — a small quadruped
      if (r.live) {
        g += `<g class="hg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + ginW * .34} ${ginY - 22})">
          <ellipse cx="4" cy="6" rx="6" ry="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="10" cy="2" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="1" y1="9" x2="1" y2="14" stroke="${r.col}" stroke-width="1"/>
          <line x1="7" y1="9" x2="7" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snagged rope — a kink in the line on errors
      if (r.err) g += `<path d="M ${x - ginW * .26} ${floorY - 14} q 4 -4 8 0 q -4 3 -8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绞盘坊", eyebrow: "PROVIDER HORSEGIN", render };
})();
