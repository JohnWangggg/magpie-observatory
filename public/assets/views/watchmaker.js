/* ---------------------------------------------------------------- watchmaker
 * Watchmaker view — a row of watchmaker's benches, one per provider.
 * Finished movements on the tray = tokens; a watchmaker bent
 * over a loupe for live sessions; a sprung mainspring marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "watchmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="wk-empty">暂无钟表坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const brass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a048" : "#786838";
      const bW = seg * .4;
      const bTop = floorY - 32;
      // the bench — a high watchmaker's bench with drawers
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="${floorY - bTop}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      for (let d = 0; d < 2; d++) {
        g += `<rect x="${x - bW * .38 + d * bW * .42}" y="${bTop + 8}" width="${bW * .34}" height="7" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<circle cx="${x - bW * .21 + d * bW * .42}" cy="${bTop + 11}" r="1" fill="${r.col}"/>`;
      }
      // the movement on the bench — a mainplate with gear wheels
      g += `<circle cx="${x}" cy="${bTop - 5}" r="7" fill="var(--card-2)" stroke="${brass}" stroke-width="1.2"/>`;
      for (let gw = 0; gw < 3; gw++) {
        const ga = gw * 2.1 + i;
        g += `<circle cx="${x + Math.cos(ga) * 4}" cy="${bTop - 5 + Math.sin(ga) * 4}" r="1.8" fill="${brass}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // balance wheel — oscillating hint
      g += `<circle cx="${x + bW * .3}" cy="${bTop - 6}" r="3" fill="none" stroke="${brass}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .3 - 3}" y1="${bTop - 6}" x2="${x + bW * .3 + 3}" y2="${bTop - 6}" stroke="${r.col}" stroke-width=".6"/>`;
      // the parts tray — finished movements in compartments, count by tokens
      g += `<rect x="${x - bW * .48}" y="${bTop - 14}" width="${bW * .3}" height="8" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      const parts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < parts; p++) {
        g += `<circle cx="${x - bW * .44 + p * bW * .1}" cy="${bTop - 10}" r="2.6" fill="${p === 0 && r.err ? "var(--red)" : brass}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a loupe standing on the bench
      g += `<line x1="${x - bW * .3}" y1="${bTop - 14}" x2="${x - bW * .34}" y2="${bTop - 20}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x - bW * .34}" cy="${bTop - 21}" r="3" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // watchmaker bent over for live sessions — hunched figure
      if (r.live) {
        g += `<g class="wk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${bTop - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M -2 3 q 6 1 8 6 l -7 2 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="6" y1="10" x2="12" y2="12" stroke="${r.col}" stroke-width="1"/>
          <circle cx="2" cy="-1" r="1.4" fill="none" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // sprung mainspring — an uncoiled spring on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${bTop - 8} q 6 -6 10 -1" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟表坊", eyebrow: "PROVIDER WATCHMAKER", render };
})();
