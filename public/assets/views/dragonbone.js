/* --------------------------------------------------------------- dragonbone
 * Dragonbone view — a row of inclined chain pumps, one per
 * provider. Paddles riding the slat chain = tokens; a farmer
 * cranking the headstock for live sessions; a dropped pallet
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dragonbone";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="db-empty">暂无龙骨水车</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water below the bank
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="#1e3348" opacity=".5"/>`;
    for (let x = 0; x < W; x += 30) g += `<path d="M ${x} ${bankY + 8} q 8 -4 16 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const troughW = seg * .55;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      // inclined trough — from low water (left) up to field (right)
      const lowX = x - troughW / 2, lowY = bankY + 10;
      const highX = x + troughW / 2, highY = bankY - 42;
      g += `<line x1="${lowX}" y1="${lowY}" x2="${highX}" y2="${highY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2.5" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<line x1="${lowX + 4}" y1="${lowY + 4}" x2="${highX + 4}" y2="${highY + 4}" stroke="${r.col}" stroke-width="1.4" opacity=".6"/>`;
      // pallets on the chain — count by tokens
      const pallets = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let p = 0; p < pallets; p++) {
        const t = (p + .5) / pallets;
        const px = lowX + (highX - lowX) * t;
        const py = lowY + (highY - lowY) * t;
        g += `<rect x="${(px - 2).toFixed(0)}" y="${(py - 4).toFixed(0)}" width="6" height="5" fill="${tint}" stroke="${r.col}" stroke-width=".7" transform="rotate(-30 ${px.toFixed(0)} ${py.toFixed(0)})" opacity=".9"/>`;
      }
      // headstock wheel at the top of the trough
      g += `<circle cx="${highX}" cy="${highY - 4}" r="7" fill="none" stroke="${r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<circle cx="${highX}" cy="${highY - 4}" r="1.8" fill="${r.col}"/>`;
      // farmer cranking for live sessions
      if (r.live) {
        g += `<g class="db-cranker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${highX + 12} ${highY - 2})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="0" x2="-10" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // dropped pallet on errors — fallen into the water
      if (r.err) g += `<rect x="${lowX + 8}" y="${bankY + 12}" width="6" height="4" fill="var(--red)" opacity=".5" transform="rotate(15 ${lowX + 11} ${bankY + 14})"/>`;
      g += `<text x="${x}" y="${bankY + 22}" text-anchor="middle" class="db-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="db-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "龙骨水车", eyebrow: "PROVIDER DRAGONBONE", render };
})();
