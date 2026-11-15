/* --------------------------------------------------------------- malthouse
 * Malthouse view — a row of germination floors, one per provider.
 * Barley sprout height = tokens; a maltster's shovel turns for
 * live sessions; a scorched patch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "malthouse";
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
    if (!rows.length) { host.innerHTML = `<div class="mh-empty">暂无芽床</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor boards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bedW = seg * .7;
      const bedH = 26;
      const bedY = floorY - bedH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08858" : "#c0a858";
      // bed frame
      g += `<rect x="${x - bedW / 2}" y="${bedY}" width="${bedW}" height="${bedH}" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // grain layer
      g += `<rect x="${x - bedW / 2 + 4}" y="${bedY + bedH - 10}" width="${bedW - 8}" height="8" fill="${tint}" opacity=".5"/>`;
      // sprouts — count by tokens
      const sprouts = Math.min(9, Math.ceil(r.tok / maxTok * 9));
      for (let s = 0; s < sprouts; s++) {
        const sx = x - bedW * .38 + (s / (sprouts - 1 || 1)) * bedW * .76;
        const sy = bedY + bedH - 10 - (s * 3) % 10;
        g += `<line x1="${sx.toFixed(0)}" y1="${bedY + bedH - 10}" x2="${sx.toFixed(0)}" y2="${sy.toFixed(0)}" stroke="${tint}" stroke-width="1"/>`;
        g += `<ellipse cx="${sx.toFixed(0)}" cy="${(sy - 2).toFixed(0)}" rx="2" ry="3" fill="${tint}" opacity=".8"/>`;
      }
      // shovel for live sessions
      if (r.live) {
        g += `<g class="mh-shovel" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x + bedW / 2 + 8}" y1="${bedY - 4}" x2="${x + bedW / 2 + 14}" y2="${bedY + bedH * .5}" stroke="${r.col}" stroke-width="1.6"/>
          <rect x="${x + bedW / 2 + 12}" y="${bedY + bedH * .5}" width="8" height="10" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scorched patch on errors
      if (r.err) g += `<ellipse cx="${x - bedW * .15}" cy="${bedY + bedH - 6}" rx="10" ry="4" fill="var(--red)" opacity=".4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mh-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "芽床", eyebrow: "PROVIDER MALTHOUSE", render };
})();
