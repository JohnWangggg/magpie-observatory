/* ---------------------------------------------------------------- pitstop
 * Pitstop view — a strip of pit lanes, one per provider. Each lane is
 * a service bay: car silhouette moves along it with token velocity,
 * tyre stack height = recent logs, red flag waves on errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pitstop";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * 0.86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);

    if (!rows.length) { host.innerHTML = `<div class="ps-empty">暂无赛道</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // tarmac strip
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<line x1="${x}" y1="${groundY + 6}" x2="${x + 12}" y2="${groundY + 6}" stroke="var(--faint)" stroke-width="1" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const laneW = seg * .7;
      // lane outline
      g += `<rect x="${(x - laneW / 2).toFixed(0)}" y="${groundY - 46}" width="${laneW.toFixed(0)}" height="46" fill="none" stroke="${r.col}" stroke-width="1.4" rx="3"/>`;
      // pit wall — hatch marks
      for (let p = 0; p < 5; p++) g += `<line x1="${(x - laneW / 2 + p * laneW / 4).toFixed(0)}" y1="${groundY - 46}" x2="${(x - laneW / 2 + p * laneW / 4).toFixed(0)}" y2="${groundY - 38}" stroke="${r.col}" stroke-width=".7" opacity=".5"/>`;
      // tyre stack — height = logs
      const tyreH = 8 + (r.tok / maxTok) * 26;
      g += `<rect x="${(x - laneW / 2 + 4).toFixed(0)}" y="${(groundY - tyreH).toFixed(0)}" width="14" height="${tyreH.toFixed(0)}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2" rx="2"/>`;
      for (let t = 0; t < 4; t++) g += `<ellipse cx="${(x - laneW / 2 + 11).toFixed(0)}" cy="${(groundY - 4 - t * 6).toFixed(0)}" rx="6" ry="2.5" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      // car — low silhouette
      const carX = x - laneW / 2 + laneW * (.15 + (r.tok / maxTok) * .7);
      g += `<g class="ps-car" style="animation-delay: ${(i * .3).toFixed(1)}s">
        <path d="M ${carX - 16} ${groundY - 8} L ${carX - 10} ${groundY - 16} L ${carX + 8} ${groundY - 18} L ${carX + 14} ${groundY - 10} L ${carX + 16} ${groundY - 8} Z" fill="${r.col}" opacity=".9"/>
        <circle cx="${(carX - 8).toFixed(0)}" cy="${groundY - 6}" r="4" fill="#1a1410"/>
        <circle cx="${(carX + 8).toFixed(0)}" cy="${groundY - 6}" r="4" fill="#1a1410"/>
        <circle cx="${(carX - 8).toFixed(0)}" cy="${groundY - 6}" r="1.6" fill="${r.col}"/>
        <circle cx="${(carX + 8).toFixed(0)}" cy="${groundY - 6}" r="1.6" fill="${r.col}"/>
      </g>`;
      // red flag on errors
      if (r.err) {
        g += `<g transform="translate(${x + laneW / 2 - 6},${groundY - 46})">
          <line x1="0" y1="0" x2="0" y2="-20" stroke="var(--red)" stroke-width="1.4"/>
          <path d="M 0 -20 L 14 -16 L 0 -12 Z" fill="var(--red)"/>
        </g>`;
      }
      g += `<text x="${x}" y="${groundY + 20}" text-anchor="middle" class="ps-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ps-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "维修站", eyebrow: "PROVIDER PITSTOP", render };
})();
