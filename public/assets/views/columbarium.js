/* ------------------------------------------------------------- columbarium
 * Columbarium view — a wall of niches, one row per provider. Glow
 * inside each niche = tokens; a lamp at the base for live sessions;
 * a cracked niche marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "columbarium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cb-empty">暂无龛位</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stone wall
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-3)"/>`;
    for (let x = 0; x < W; x += 20) g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".5" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    const nicheW = seg * .7, nicheH = 40;
    const nicheY = floorY - nicheH - 8;
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // niche frame
      g += `<rect x="${x - nicheW / 2}" y="${nicheY}" width="${nicheW}" height="${nicheH}" rx="2" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // inner glow — intensity by tokens
      const glow = r.tok / maxTok;
      g += `<ellipse cx="${x}" cy="${nicheY + nicheH * .55}" rx="${nicheW * .38}" ry="${nicheH * .32}" fill="${tint}" opacity="${(glow * .5).toFixed(2)}"/>`;
      // urn silhouette inside
      g += `<path d="M ${x - 5} ${nicheY + nicheH * .3} L ${x + 5} ${nicheY + nicheH * .3} L ${x + 3} ${nicheY + nicheH * .75} L ${x - 3} ${nicheY + nicheH * .75} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x}" cy="${nicheY + nicheH * .3}" rx="5" ry="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // lamp at base for live sessions
      if (r.live) {
        g += `<g class="cb-lamp" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x - nicheW * .45} ${floorY - 6} L ${x - nicheW * .35} ${floorY - 6} L ${x - nicheW * .4} ${floorY - 12} Z" fill="${tint}" opacity=".9"/>
          <line x1="${x - nicheW * .4}" y1="${floorY - 12}" x2="${x - nicheW * .4}" y2="${floorY - 16}" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked niche on errors
      if (r.err) g += `<path d="M ${x - nicheW * .2} ${nicheY} L ${x + nicheW * .05} ${nicheY + nicheH * .4} L ${x - nicheW * .1} ${nicheY + nicheH * .7}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "龛堂", eyebrow: "PROVIDER COLUMBARIUM", render };
})();
