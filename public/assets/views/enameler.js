/* ----------------------------------------------------------------- enameler
 * Enameler view — a row of muffle kilns, one per provider.
 * Fired plaques cooling on the shelf = tokens; an enameler
 * painting wet enamel for live sessions; a bubbled plaque marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "enameler";
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
    if (!rows.length) { host.innerHTML = `<div class="em-empty">暂无珐琅坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const smalt = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#3868c0" : "#284068";
      const kW = seg * .36;
      const kTop = floorY - 44;
      // the muffle kiln — a beehive brick kiln with a small door
      g += `<path d="M ${x - kW * .3} ${floorY - 8} a ${kW * .3} ${floorY - kTop - 8} 0 0 1 ${kW * .6} 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<rect x="${x - kW * .08}" y="${floorY - 20}" width="${kW * .16}" height="12" rx="3" fill="#301808" stroke="${r.col}" stroke-width=".9"/>`;
      // the glow inside the door
      g += `<ellipse cx="${x}" cy="${floorY - 14}" rx="${kW * .05}" ry="3.5" fill="#f08030" opacity=".9"/>`;
      // brick courses on the dome
      for (let b = 0; b < 3; b++) {
        g += `<path d="M ${x - kW * .26 + b * 2} ${kTop + 14 + b * 8} q ${kW * .3 - b * 2} -8 ${kW * .52 - b * 4} 0" fill="none" stroke="${r.col}" stroke-width=".5" opacity=".5"/>`;
      }
      // the work piece on a stilt — a plaque being fired
      g += `<line x1="${x - kW * .55}" y1="${floorY}" x2="${x - kW * .5}" y2="${floorY - 16}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - kW * .56}" y="${floorY - 22}" width="9" height="7" rx="1" fill="${r.err ? "var(--red)" : smalt}" stroke="${r.col}" stroke-width=".7"/>`;
      // cooling shelf — finished plaques, count by tokens
      g += `<line x1="${x + kW * .44}" y1="${floorY}" x2="${x + kW * .44}" y2="${kTop + 10}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + kW * .34}" y1="${kTop + 14}" x2="${x + kW * .56}" y2="${kTop + 14}" stroke="${r.col}" stroke-width="1.2"/>`;
      const plaques = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < plaques; p++) {
        g += `<rect x="${x + kW * .36 + p * kW * .07}" y="${kTop + 8}" width="5" height="6" rx=".8" fill="${p === 0 && r.err ? "var(--red)" : smalt}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${x + kW * .38 + p * kW * .07}" cy="${kTop + 11}" r="1.2" fill="#e8e0d0" opacity=".8"/>`;
      }
      // pigment pots on the shelf base
      for (let g2 = 0; g2 < 3; g2++) {
        g += `<circle cx="${x + kW * .36 + g2 * 5}" cy="${floorY - 4}" r="2" fill="${["#c03828", "#e0c050", "#3868c0"][g2]}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // enameler painting for live sessions — figure with a fine brush
      if (r.live) {
        g += `<g class="em-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - kW * .68} ${kTop + 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="12" stroke="${r.col}" stroke-width=".9"/>
          <circle cx="14" cy="13" r=".8" fill="${smalt}"/>
        </g>`;
      }
      // bubbled plaque — a blister on errors
      if (r.err) {
        g += `<circle cx="${x - kW * .52}" cy="${floorY - 19}" r="1.4" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="em-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="em-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "珐琅坊", eyebrow: "PROVIDER ENAMELER", render };
})();
