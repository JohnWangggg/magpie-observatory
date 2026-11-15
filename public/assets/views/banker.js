/* ------------------------------------------------------------------- banker
 * Banker view — a row of mason's bankers, one per provider.
 * Dressed stones stacked on the pallet = tokens; a mason
 * driving a chisel for live sessions; a flawed block marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "banker";
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
    if (!rows.length) { host.innerHTML = `<div class="bnk-empty">暂无石作台</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    // stone chips scattered on the floor
    for (let c = 0; c < 12; c++) {
      g += `<circle cx="${(c * 97) % W}" cy="${floorY + 4 + (c % 3) * 3}" r=".8" fill="var(--muted)" opacity=".5"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const stone = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8b0a0" : "#706a60";
      const bW = seg * .4;
      const bTop = floorY - 24;
      // the banker — a heavy wooden workbench
      g += `<rect x="${x - bW / 2}" y="${bTop}" width="${bW}" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<rect x="${x - bW * .42}" y="${bTop + 6}" width="6" height="${floorY - bTop - 6}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x + bW * .34}" y="${bTop + 6}" width="6" height="${floorY - bTop - 6}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the stone block on the banker — being dressed
      g += `<rect x="${x - bW * .2}" y="${bTop - 14}" width="${bW * .44}" height="14" rx="1" fill="${stone}" stroke="${r.col}" stroke-width="1"/>`;
      // drafted margin — dressed edge lines
      g += `<line x1="${x - bW * .2}" y1="${bTop - 11}" x2="${x + bW * .24}" y2="${bTop - 11}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      g += `<line x1="${x - bW * .2}" y1="${bTop - 4}" x2="${x + bW * .24}" y2="${bTop - 4}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      // tooling marks on the face
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x - bW * .14 + t * bW * .13}" y1="${bTop - 10}" x2="${x - bW * .12 + t * bW * .13}" y2="${bTop - 2}" stroke="${t === 0 && r.err ? "var(--red)" : r.col}" stroke-width=".5" opacity=".5"/>`;
      }
      // chisel set in the stone
      g += `<line x1="${x + bW * .06}" y1="${bTop - 14}" x2="${x + bW * .1}" y2="${bTop - 22}" stroke="${r.col}" stroke-width="1.4"/>`;
      // dressed stones on a pallet — stacked ashlars, count by tokens
      g += `<rect x="${x + bW * .5}" y="${floorY - 3}" width="${bW * .36}" height="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      const ashlars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let a = 0; a < ashlars; a++) {
        g += `<rect x="${x + bW * .52 + (a % 2) * bW * .17}" y="${floorY - 10 - Math.floor(a / 2) * 7}" width="${bW * .15}" height="7" rx="1" fill="${a === 0 && r.err ? "var(--red)" : stone}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a square and mallet beside
      g += `<path d="M ${x - bW * .56} ${floorY - 14} l 0 -8 l 8 0" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x - bW * .6}" cy="${floorY - 4}" rx="4" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // mason driving for live sessions — figure with raised mallet
      if (r.live) {
        g += `<g class="bnk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .48} ${bTop - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="13" y2="1" stroke="${r.col}" stroke-width="1.1"/>
          <rect x="12" y="-2" width="5" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // flawed block — a crack through the face on errors
      if (r.err) g += `<path d="M ${x - bW * .05} ${bTop - 14} l 6 6 l -3 6" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bnk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bnk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石作台", eyebrow: "PROVIDER BANKER", render };
})();
