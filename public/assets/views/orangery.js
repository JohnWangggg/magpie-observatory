/* ---------------------------------------------------------------- orangery
 * Orangery view — a glasshouse aisle of potted citrus trees, one
 * per provider. Fruit on the tree = tokens; a watering can beside
 * the pot for live sessions; a cracked pot marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "orangery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="og-empty">暂无橘树</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // glasshouse roof ribs
    g += `<path d="M 0 ${floorY * .35} Q ${W / 2} ${floorY * .02} ${W} ${floorY * .35}" fill="none" stroke="var(--line)" stroke-width="1.4" opacity=".5"/>`;
    for (let x = 0; x < W; x += W / 12) g += `<line x1="${x}" y1="${floorY * .35}" x2="${x}" y2="${floorY}" stroke="var(--line)" stroke-width=".7" opacity=".35"/>`;
    // tile floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 20) g += `<rect x="${x}" y="${floorY + 4}" width="14" height="3" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const treeH = 40 + (r.tok / maxTok) * 56;
      const potW = seg * .34;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8a838" : "#e8c860";
      // pot
      g += `<path d="M ${x - potW / 2} ${floorY - 12} L ${x + potW / 2} ${floorY - 12} L ${x + potW / 2 - 4} ${floorY} L ${x - potW / 2 + 4} ${floorY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      if (r.err) g += `<line x1="${x - 4}" y1="${floorY - 12}" x2="${x + 3}" y2="${floorY - 2}" stroke="var(--red)" stroke-width="1.4"/>`;
      // trunk
      g += `<line x1="${x}" y1="${floorY - 12}" x2="${x}" y2="${floorY - 12 - treeH * .4}" stroke="#7a5a3a" stroke-width="2.4"/>`;
      // canopy
      g += `<ellipse cx="${x}" cy="${floorY - 12 - treeH * .62}" rx="${treeH * .38}" ry="${treeH * .3}" fill="#4a8a4a" opacity=".85" stroke="${r.col}" stroke-width="1"/>`;
      // fruit — oranges sized by tokens
      const fruits = Math.min(9, Math.ceil(r.tok / maxTok * 9));
      for (let f = 0; f < fruits; f++) {
        const fa = (f / fruits) * Math.PI * 2 + i;
        const fr = treeH * .22;
        g += `<circle cx="${(x + Math.cos(fa) * fr).toFixed(0)}" cy="${(floorY - 12 - treeH * .62 + Math.sin(fa) * fr * .8).toFixed(0)}" r="3" fill="${tint}"/>`;
      }
      // watering can for live sessions
      if (r.live) {
        g += `<g class="og-can" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + potW / 2 + 4}" y="${floorY - 10}" width="10" height="8" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="${x + potW / 2 + 14}" y1="${floorY - 8}" x2="${x + potW / 2 + 20}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="og-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="og-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "橘温室", eyebrow: "PROVIDER ORANGERY", render };
})();
