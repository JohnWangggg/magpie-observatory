/* -------------------------------------------------------------------- planer
 * Planer view — a row of planing machines, one per provider.
 * Curled chips off the bed = tokens; a machinist at the
 * clapper box for live sessions; a torn surface marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "planer";
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
    if (!rows.length) { host.innerHTML = `<div class="pl-empty">暂无刨床坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // machine-shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8c0d0" : "#788090";
      const bedW = seg * .55;
      const bedY = floorY - 24;
      // the planing bed — a long table with V-ways
      g += `<line x1="${x - bedW / 2}" y1="${bedY}" x2="${x + bedW / 2}" y2="${bedY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - bedW * .35}" y1="${bedY}" x2="${x - bedW * .35}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + bedW * .35}" y1="${bedY}" x2="${x + bedW * .35}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - bedW * .2}" y1="${bedY - 2}" x2="${x + bedW * .2}" y2="${bedY - 2}" stroke="${r.col}" stroke-width=".9" opacity=".6"/>`;
      // workpiece — a block on the table
      g += `<rect x="${x - bedW * .18}" y="${bedY - 8}" width="${bedW * .36}" height="8" rx="1" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : iron}" stroke-width="1.2"/>`;
      // the ram and clapper box — a head above the workpiece
      g += `<rect x="${x - bedW * .08}" y="${bedY - 22}" width="${bedW * .16}" height="12" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - 3}" y="${bedY - 10}" width="6" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // chips — curls off the workpiece, count by tokens
      const chips = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < chips; c++) {
        g += `<path d="M ${x - bedW * .28 + c * 10} ${bedY - 10} q 3 -5 6 0" stroke="${iron}" stroke-width="1" fill="none" opacity=".85"/>`;
      }
      // swarf pile on the floor
      const swarf = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let s = 0; s < swarf; s++) {
        g += `<path d="M ${x + bedW * .36} ${floorY - 4 - s * 3} q 3 -3 6 0" stroke="${iron}" stroke-width=".9" fill="none" opacity=".7"/>`;
      }
      // keyway — a slot on the workpiece end
      g += `<line x1="${x + bedW * .12}" y1="${bedY - 8}" x2="${x + bedW * .12}" y2="${bedY - 2}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // machinist at the clapper box for live sessions — figure with a wrench
      if (r.live) {
        g += `<g class="pl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bedW * .4} ${bedY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // torn surface — a groove lifted on the workpiece on errors
      if (r.err) g += `<path d="M ${x - bedW * .1} ${bedY - 8} q 8 -4 16 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "刨床坊", eyebrow: "PROVIDER PLANER", render };
})();
