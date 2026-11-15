/* -------------------------------------------------------------- parchmenter
 * Parchmenter view — a row of stretching frames, one per provider.
 * Skins drying on the frame = tokens; a parchmenter
 * scraping for live sessions; a torn skin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "parchmenter";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pch-empty">暂无羊皮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const frameY = floorY - 28;
      const skin = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a8" : "#a09070";
      // the stretching frame — posts and a rail
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="32" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="32" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .38}" y1="${frameY}" x2="${x + bW * .32}" y2="${frameY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .38}" y1="${frameY - 8}" x2="${x + bW * .32}" y2="${frameY - 8}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // skins drying — rectangular parchments on the frame, count by tokens
      const skins = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < skins; s++) {
        const sx = x - bW * .3 + s * bW * .2;
        g += `<rect x="${sx - 8}" y="${frameY - 6}" width="16" height="18" rx="1" fill="${s === 0 && r.err ? "var(--red)" : skin}" stroke="${r.col}" stroke-width=".7"/>`;
        // lacing to the frame
        g += `<line x1="${sx - 8}" y1="${frameY - 6}" x2="${sx - 8}" y2="${frameY - 8}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx + 8}" y1="${frameY - 6}" x2="${sx + 8}" y2="${frameY - 8}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx - 8}" y1="${frameY + 12}" x2="${sx - 8}" y2="${frameY + 14}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx + 8}" y1="${frameY + 12}" x2="${sx + 8}" y2="${frameY + 14}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a scraping beam — a curved blade on a stand
      g += `<rect x="${x - bW * .44}" y="${floorY - 6}" width="8" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x - bW * .42} ${floorY - 6} q 2 -8 4 -10 q 2 2 -4 10 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a tub of lime — a soak vat
      g += `<rect x="${x + bW * .34}" y="${floorY - 6}" width="10" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .39}" cy="${floorY - 3}" rx="3.5" ry="1.5" fill="#c8b898" stroke="${r.col}" stroke-width=".4"/>`;
      // a finished roll — a rolled parchment
      g += `<rect x="${x - bW * .1}" y="${floorY - 4}" width="${bW * .2}" height="4" rx="2" fill="${r.err ? "var(--red)" : skin}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .1}" cy="${floorY - 2}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      // parchmenter scraping for live sessions — figure at the frame
      if (r.live) {
        g += `<g class="pch-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${frameY - 22})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn skin — a rip on the parchment on errors
      if (r.err) g += `<path d="M ${x - bW * .3} ${frameY - 6} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="pch-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pch-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "羊皮纸", eyebrow: "PROVIDER PARCHMENTER", render };
})();
