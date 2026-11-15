/* --------------------------------------------------------------- brickyard
 * Brickyard view — a row of bottle kilns, one per provider. Smoke
 * from the chimney = tokens; a cart of green bricks waits for live
 * sessions; a cracked kiln marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brickyard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="by-empty">暂无砖窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<rect x="${x}" y="${yardY + 6}" width="12" height="4" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const kilnH = 50 + (r.tok / maxTok) * 30;
      const kilnW = seg * .38;
      const kilnY = yardY - kilnH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c84838" : "#a06848";
      // kiln body — bottle shape
      g += `<path d="M ${x - kilnW / 2} ${yardY} L ${x - kilnW / 2 + 4} ${kilnY + kilnH * .3} Q ${x - kilnW / 2 + 4} ${kilnY} ${x} ${kilnY} Q ${x + kilnW / 2 - 4} ${kilnY} ${x + kilnW / 2 - 4} ${kilnY + kilnH * .3} L ${x + kilnW / 2} ${yardY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // chimney
      g += `<rect x="${x - 3}" y="${kilnY - 18}" width="6" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - 5}" y="${kilnY - 20}" width="10" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // fire glow at base
      g += `<ellipse cx="${x}" cy="${yardY - 6}" rx="${kilnW * .3}" ry="6" fill="${tint}" opacity=".5"/>`;
      // smoke puffs — count by tokens
      const puffs = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let s = 0; s < puffs; s++) {
        const sy = kilnY - 24 - s * 9;
        const sx = x + s * 5;
        g += `<circle class="by-smoke" style="animation-delay: ${(i * .3 + s * .2).toFixed(1)}s" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${(4 + s * 1.5).toFixed(1)}" fill="${tint}" opacity="${(.9 - s * .12).toFixed(1)}"/>`;
      }
      // cart of green bricks for live sessions
      if (r.live) {
        g += `<g class="by-cart" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + kilnW / 2 + 6}" y="${yardY - 12}" width="16" height="10" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="${x + kilnW / 2 + 10}" cy="${yardY - 2}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="${x + kilnW / 2 + 18}" cy="${yardY - 2}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked kiln on errors
      if (r.err) g += `<path d="M ${x - kilnW * .2} ${kilnY + kilnH * .4} L ${x + kilnW * .1} ${kilnY + kilnH * .6} L ${x - kilnW * .05} ${kilnY + kilnH * .8}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="by-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="by-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "砖窑", eyebrow: "PROVIDER BRICKYARD", render };
})();
