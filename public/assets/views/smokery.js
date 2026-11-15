/* ------------------------------------------------------------------ smokery
 * Smokery view — a row of smoke racks, one per provider. Sides
 * of fish hanging on the speet = tokens; a smoker stoking the
 * fire for live sessions; a dropped side marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "smokery";
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
    if (!rows.length) { host.innerHTML = `<div class="sm-empty">暂无熏房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c89860" : "#a07040";
      const rackTop = floorY - 50;
      const rackW = seg * .5;
      // speet rack — two posts with a crossbar
      g += `<line x1="${x - rackW * .4}" y1="${floorY}" x2="${x - rackW * .4}" y2="${rackTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + rackW * .4}" y1="${floorY}" x2="${x + rackW * .4}" y2="${rackTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - rackW * .45}" y1="${rackTop}" x2="${x + rackW * .45}" y2="${rackTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      // firebed under the rack
      g += `<rect x="${x - rackW * .2}" y="${floorY - 6}" width="${rackW * .4}" height="6" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x}" cy="${floorY - 8}" r="2" fill="var(--amber)" opacity=".9"/>`;
      // sides hanging off the crossbar — count by tokens
      const sides = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < sides; s++) {
        const sx = x - rackW * .3 + s * (rackW * .6 / (sides - 1 || 1));
        const sh = 12 + (r.tok / maxTok) * 10;
        g += `<path d="M ${sx} ${rackTop} q -3 ${sh * .5} 0 ${sh} q 3 ${sh * .5} 0 -${sh}" fill="${s === 0 && r.err ? "var(--red)" : tint}" stroke="${r.col}" stroke-width=".7" opacity=".9"/>`;
      }
      // smoker stoking for live sessions
      if (r.live) {
        g += `<g class="sm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - rackW * .45 - 8} ${floorY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // dropped side — a side fallen to the floor on errors
      if (r.err) g += `<path d="M ${x + rackW * .2} ${floorY - 2} q 6 -3 10 0" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "熏坊", eyebrow: "PROVIDER SMOKERY", render };
})();
