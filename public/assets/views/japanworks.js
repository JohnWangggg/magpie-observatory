/* ---------------------------------------------------------------- japanworks
 * Japanworks view — a row of drying racks, one per provider.
 * Tins lacquered on the rack = tokens; a japanner dipping for
 * live sessions; a blistered piece marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "japanworks";
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
    if (!rows.length) { host.innerHTML = `<div class="jp-empty">暂无涂漆坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const lac = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#181410" : "#383028";
      const rackTop = floorY - 44;
      const rackW = seg * .55;
      // drying rack — two posts with shelves
      g += `<line x1="${x - rackW / 2}" y1="${floorY}" x2="${x - rackW / 2}" y2="${rackTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + rackW / 2}" y1="${floorY}" x2="${x + rackW / 2}" y2="${rackTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      for (let sh = 0; sh < 3; sh++) {
        g += `<line x1="${x - rackW / 2 - 4}" y1="${rackTop + sh * 12}" x2="${x + rackW / 2 + 4}" y2="${rackTop + sh * 12}" stroke="${r.col}" stroke-width="1.2"/>`;
      }
      // japanned tins on the shelves — trays and boxes, count by tokens
      const tins = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let t = 0; t < tins; t++) {
        const ty = rackTop + (t % 3) * 12 - 4;
        const tx = x - rackW * .3 + Math.floor(t / 3) * (rackW * .35) + (t % 3) * 2;
        g += `<rect x="${tx}" y="${ty}" width="8" height="5" rx="1" fill="${t === 0 && r.err ? "var(--red)" : lac}" stroke="${r.col}" stroke-width=".7" opacity=".95"/>`;
      }
      // dipping pot beside the rack
      g += `<ellipse cx="${x - rackW / 2 - 8}" cy="${floorY - 4}" rx="5" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<ellipse cx="${x - rackW / 2 - 8}" cy="${floorY - 5}" rx="3.5" ry="1.6" fill="${lac}"/>`;
      // japanner dipping for live sessions
      if (r.live) {
        g += `<g class="jp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - rackW / 2 - 18} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="12" y2="12" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // blistered piece — a bubbled tray on errors
      if (r.err) g += `<circle cx="${x - rackW * .28}" cy="${rackTop - 5}" r="2" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="jp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="jp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "涂漆坊", eyebrow: "PROVIDER JAPANWORKS", render };
})();
