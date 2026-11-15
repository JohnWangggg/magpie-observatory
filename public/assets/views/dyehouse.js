/* ------------------------------------------------------------------ dyehouse
 * Dyehouse view — a row of dye becks, one per provider. Skeins
 * hanging on the tenter beside = tokens; a dyer stirring the
 * beck for live sessions; a blotched skein marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dyehouse";
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
    if (!rows.length) { host.innerHTML = `<div class="dh-empty">暂无染坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // dyehouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const dye = r.err ? "#e06048" : r.col;
      const beckY = floorY - 12;
      // the beck — a wide tub of dye with a firebed under
      g += `<ellipse cx="${x}" cy="${beckY}" rx="${seg * .26}" ry="7" fill="${dye}" stroke="${r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""} opacity=".9"/>`;
      g += `<rect x="${x - seg * .26}" y="${beckY}" width="${seg * .52}" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // liquor surface swirl
      g += `<path d="M ${x - seg * .2} ${beckY - 2} q ${seg * .2} -4 ${seg * .4} 0" stroke="${dye}" stroke-width="1" fill="none" opacity=".7"/>`;
      // tenter frame beside the beck — a drying rail on posts
      g += `<line x1="${x + seg * .32}" y1="${floorY}" x2="${x + seg * .32}" y2="${floorY - 40}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + seg * .26}" y1="${floorY - 40}" x2="${x + seg * .46}" y2="${floorY - 40}" stroke="${r.col}" stroke-width="1.4"/>`;
      // skeins on the tenter — count by tokens
      const skeins = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < skeins; s++) {
        const sx = x + seg * .28 + s * (seg * .055);
        g += `<path d="M ${sx} ${floorY - 40} q -3 10 0 18 q 3 10 0 18" stroke="${s === 0 && r.err ? "var(--red)" : dye}" stroke-width="2.2" fill="none"/>`;
      }
      // dyer stirring the beck for live sessions
      if (r.live) {
        g += `<g class="dh-dyer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .26 - 8} ${beckY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="2" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // blotched skein — a dark patch on errors
      if (r.err) g += `<circle cx="${x + seg * .28}" cy="${floorY - 26}" r="3" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="dh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "染坊", eyebrow: "PROVIDER DYEHOUSE", render };
})();
