/* ------------------------------------------------------------------- nailery
 * Nailery view — a row of nail stithies, one per provider.
 * Nails knocked off the header = tokens; a nailer at the
 * oliver for live sessions; a bent nail marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nailery";
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
    if (!rows.length) { host.innerHTML = `<div class="nl-empty">暂无钉坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c0c8d0" : "#889098";
      const anvilY = floorY - 16;
      // stithy — a stumpy anvil on a block
      g += `<rect x="${x - 6}" y="${anvilY + 4}" width="12" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<path d="M ${x - 12} ${anvilY + 4} q -6 -8 6 -10 l 12 0 q 12 2 6 10 Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // header — a small plate on the anvil with a nail through
      g += `<rect x="${x - 8}" y="${anvilY - 8}" width="16" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x}" y1="${anvilY - 8}" x2="${x}" y2="${anvilY - 14}" stroke="${steel}" stroke-width="1.6"/>`;
      // nails knocked off — strewn beside, count by tokens
      const nails = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let n = 0; n < nails; n++) {
        const nx = x + seg * .3 + (n % 2) * 7;
        const ny = floorY - 4 - Math.floor(n / 2) * 5;
        g += `<line x1="${nx}" y1="${ny}" x2="${nx + 5}" y2="${ny + 2}" stroke="${n === 0 && r.err ? "var(--red)" : steel}" stroke-width="1.2"/>`;
        g += `<circle cx="${nx}" cy="${ny}" r=".9" fill="${r.col}"/>`;
      }
      // nailer at the oliver for live sessions — spring hammer overhead
      if (r.live) {
        g += `<g class="nl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .28 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="0" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
        // the oliver — a spring pole with a hammer
        g += `<line x1="${x + seg * .38}" y1="${floorY}" x2="${x + seg * .38}" y2="${anvilY - 22}" stroke="${r.col}" stroke-width="1.4"/>`;
        g += `<path d="M ${x + seg * .38} ${anvilY - 22} q -10 -6 -18 -2" stroke="${r.col}" stroke-width="1.2" fill="none"/>`;
      }
      // bent nail — a crooked one on errors
      if (r.err) g += `<path d="M ${x + seg * .3} ${floorY - 8} l 3 -4 l 3 2" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="nl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="nl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钉坊", eyebrow: "PROVIDER NAILERY", render };
})();
