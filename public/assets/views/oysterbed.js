/* ------------------------------------------------------------------ oysterbed
 * Oysterbed view — a row of oyster parks, one per provider.
 * Oysters fattening on the bouchot = tokens; an ostreiculteur
 * tending for live sessions; a smashed shell marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oysterbed";
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
    if (!rows.length) { host.innerHTML = `<div class="ob-empty">暂无牡蛎床</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // tidal flat — water and mud
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<rect x="0" y="${floorY - 10}" width="${W}" height="10" fill="var(--card-3)" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const shell = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a8b8c0" : "#687880";
      const bedW = seg * .46;
      // the bouchot — rows of posts driven into the mud
      for (let p = 0; p < 4; p++) {
        const px = x - bedW * .4 + p * bedW * .26;
        g += `<line x1="${px}" y1="${floorY - 4}" x2="${px}" y2="${floorY - 22}" stroke="${r.col}" stroke-width="1.4"/>`;
      }
      // oyster shells — on the posts, count by tokens
      const oys = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let o = 0; o < oys; o++) {
        const ox = x - bedW * .4 + o * bedW * .26;
        // a bivalve shell
        g += `<path d="M ${ox - 3} ${floorY - 16} a 3.5 3.5 0 0 1 7 0 l -1 3 h -5 z" fill="${o === 0 && r.err ? "var(--red)" : shell}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${ox - 2}" y1="${floorY - 16}" x2="${ox + 2}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      }
      // the tide mark — a waterline through the posts
      g += `<line x1="${x - bedW / 2}" y1="${floorY - 8}" x2="${x + bedW / 2}" y2="${floorY - 8}" stroke="#7898a8" stroke-width=".8" opacity=".5" stroke-dasharray="4 3"/>`;
      // a collecting basket beside
      g += `<ellipse cx="${x + bedW * .46}" cy="${floorY - 8}" rx="5" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // ostreiculteur tending for live sessions — figure in a flat boat
      if (r.live) {
        g += `<g class="ob-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bedW * .48} ${floorY - 26})">
          <path d="M -8 6 q 8 4 16 0 l -2 -3 h -12 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="0" cy="0" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-2" y="2" width="5" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>
          <line x1="4" y1="4" x2="12" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // smashed shell — a broken bivalve on errors
      if (r.err) g += `<path d="M ${x - bedW * .28} ${floorY - 18} l 6 4 l -2 -6" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ob-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ob-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "牡蛎床", eyebrow: "PROVIDER OYSTERBED", render };
})();
