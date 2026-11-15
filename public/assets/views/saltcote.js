/* ------------------------------------------------------------------ saltcote
 * Saltcote view — a row of crystallizing troughs, one per
 * provider. Salt raked out of the trough = tokens; a walloper
 * stirring for live sessions; a muddy crust marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "saltcote";
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
    if (!rows.length) { host.innerHTML = `<div class="sc-empty">暂无盐屋</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cote floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const salt = r.err ? "#e06048" : "#e8e4d8";
      const troughW = seg * .55;
      const troughY = floorY - 14;
      // crystallizing trough — a shallow lead pan
      g += `<rect x="${x - troughW / 2}" y="${troughY}" width="${troughW}" height="10" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // brine + crystal skin on top
      g += `<rect x="${x - troughW / 2 + 2}" y="${troughY + 2}" width="${troughW - 4}" height="3" rx="1" fill="${r.err ? "var(--red)" : "#78a8c0"}" opacity=".5"/>`;
      const crust = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < crust; c++) {
        g += `<rect x="${x - troughW * .3 + c * (troughW * .22)}" y="${troughY}" width="${troughW * .14}" height="3" fill="${salt}" opacity=".9"/>`;
      }
      // firebed under the trough
      g += `<rect x="${x - troughW * .3}" y="${floorY - 8}" width="${troughW * .6}" height="6" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x}" cy="${floorY - 6}" r="1.6" fill="var(--amber)" opacity=".9"/>`;
      // raked salt — a heap beside the trough
      const heap = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let p = 0; p < heap; p++) {
        g += `<path d="M ${x + troughW / 2 + 4 + p * 8} ${floorY} q 4 -7 8 0 Z" fill="${salt}" opacity=".85"/>`;
      }
      // walloper stirring for live sessions
      if (r.live) {
        g += `<g class="sc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - troughW / 2 - 8} ${troughY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // muddy crust — dark patches on errors
      if (r.err) g += `<circle cx="${x - troughW * .15}" cy="${troughY + 1}" r="2" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "盐屋", eyebrow: "PROVIDER SALTCOTE", render };
})();
