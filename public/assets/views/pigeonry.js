/* ---------------------------------------------------------------- pigeonry
 * Pigeonry view — a wall of nest holes, one block per provider.
 * Doves at the holes = tokens; a circling bird above for live
 * sessions; a cracked hole marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pigeonry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const wallY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pg-empty">暂无鸽房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stone wall
    g += `<rect y="${wallY}" width="${W}" height="${H - wallY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 20) for (let y = wallY; y < H; y += 20) g += `<rect x="${x}" y="${y}" width="16" height="16" fill="none" stroke="var(--line)" stroke-width=".5" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const blockW = seg * .7;
      const blockH = 40;
      const blockY = wallY - blockH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b0b8c8" : "#8890a0";
      // block of 4 holes — 2x2
      const holes = 4;
      const holeR = 7;
      for (let h = 0; h < holes; h++) {
        const hx = x - blockW * .25 + (h % 2) * blockW * .5;
        const hy = blockY + 8 + Math.floor(h / 2) * 16;
        g += `<circle cx="${hx.toFixed(0)}" cy="${hy.toFixed(0)}" r="${holeR}" fill="var(--bg)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err && h === 0 ? 'stroke-dasharray="3 2"' : ""}/>`;
        // dove at hole — by tokens
        if (h < Math.ceil(r.tok / maxTok * holes)) {
          g += `<ellipse cx="${hx.toFixed(0)}" cy="${hy.toFixed(0)}" rx="3" ry="4" fill="${tint}" opacity=".9"/>`;
          g += `<circle cx="${(hx + 2).toFixed(0)}" cy="${(hy - 3).toFixed(0)}" r="1.5" fill="${tint}"/>`;
        }
      }
      // circling bird above for live sessions
      if (r.live) {
        g += `<g class="pg-circler" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x - 10} ${blockY - 12} q 5 -6 10 0 q -5 6 -10 0" stroke="${r.col}" stroke-width="1.2" fill="none"/>
          <circle cx="${x}" cy="${blockY - 12}" r="2" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x}" y="${wallY + 18}" text-anchor="middle" class="pg-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鸽房", eyebrow: "PROVIDER PIGEONRY", render };
})();
