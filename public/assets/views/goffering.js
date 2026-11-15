/* ----------------------------------------------------------------- goffering
 * Goffering view — a row of goffering-iron stands, one per provider.
 * Frilled collars cooling on the rail = tokens; a laundress
 * ironing for live sessions; a scorched frill marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "goffering";
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
    if (!rows.length) { host.innerHTML = `<div class="gf-empty">暂无褶熨坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // laundry floor with a warming stove glow
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const linen = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0ece0" : "#c0b8a0";
      const stW = seg * .34;
      const top = floorY - 30;
      // the goffering stand — a tripod holding a heated tube
      g += `<line x1="${x - stW * .3}" y1="${floorY}" x2="${x}" y2="${top + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + stW * .3}" y1="${floorY}" x2="${x}" y2="${top + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${top + 8}" stroke="${r.col}" stroke-width="1"/>`;
      // the iron tube — barrel shaped
      g += `<rect x="${x - stW * .4}" y="${top - 4}" width="${stW * .8}" height="9" rx="4.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - stW * .2}" y1="${top - 4}" x2="${x - stW * .2}" y2="${top + 5}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      g += `<line x1="${x + stW * .2}" y1="${top - 4}" x2="${x + stW * .2}" y2="${top + 5}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      // the frill — a starched ruff being pressed around the tube
      g += `<path d="M ${x - stW * .34} ${top - 6} q ${stW * .17} -8 ${stW * .34} 0 q ${stW * .17} 8 ${stW * .34} 0" fill="none" stroke="${linen}" stroke-width="1.6"/>`;
      for (let pl = 0; pl < 3; pl++) {
        g += `<path d="M ${x - stW * .34 + pl * stW * .22} ${top - 6} q 2 -4 4 -4" fill="none" stroke="${linen}" stroke-width=".7" opacity=".7"/>`;
      }
      // cooling rail — a bar with finished frills, count by tokens
      g += `<line x1="${x + stW * .5}" y1="${top - 10}" x2="${x + stW * .5}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + stW * .42}" y1="${top - 6}" x2="${x + stW * .62}" y2="${top - 6}" stroke="${r.col}" stroke-width="1"/>`;
      const frills = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < frills; f++) {
        g += `<path d="M ${x + stW * .44 + f * stW * .07} ${top - 5} q 3 8 0 14" fill="none" stroke="${f === 0 && r.err ? "var(--red)" : linen}" stroke-width="1.3"/>`;
      }
      // a charcoal stove heating irons beside
      g += `<rect x="${x - stW * .6}" y="${floorY - 10}" width="8" height="10" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x - stW * .6 + 4}" cy="${floorY - 5}" r="1.8" fill="#e08030"/>`;
      // laundress ironing for live sessions
      if (r.live) {
        g += `<g class="gf-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - stW * .48} ${top - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="14" y2="11" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // scorched frill — a singed ruff on errors
      if (r.err) g += `<path d="M ${x + stW * .1} ${top - 8} l 5 -4 l -1 6" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gf-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "褶熨坊", eyebrow: "PROVIDER GOFFERING", render };
})();
