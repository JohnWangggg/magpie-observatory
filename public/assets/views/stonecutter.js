/* -------------------------------------------------------------- stonecutter
 * Stonecutter view — a row of masons' yards, one per provider.
 * Dressed blocks stacked on the banker = tokens; a stonecutter
 * chiselling for live sessions; a split block marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stonecutter";
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
    if (!rows.length) { host.innerHTML = `<div class="stc-empty">暂无石场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — gravel
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const bankY = floorY - 12;
      const stone = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a8a8b8" : "#787888";

      // the banker — a heavy bench
      g += `<rect x="${x - bW * .3}" y="${bankY}" width="${bW * .6}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .24}" y="${bankY + 6}" width="6" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .18}" y="${bankY + 6}" width="6" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // a block on the banker — being dressed
      g += `<rect x="${x - bW * .14}" y="${bankY - 10}" width="${bW * .28}" height="10" fill="${r.err ? "var(--red)" : stone}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .14}" y1="${bankY - 5}" x2="${x + bW * .14}" y2="${bankY - 5}" stroke="${r.col}" stroke-width=".3"/>`;
      // chisel marks
      for (let c = 0; c < 3; c++) {
        g += `<line x1="${x - bW * .1 + c * bW * .1}" y1="${bankY - 8}" x2="${x - bW * .08 + c * bW * .1}" y2="${bankY - 6}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // dressed blocks — a stack on the ground, count by tokens
      const blocks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < blocks; b++) {
        const bx = x - bW * .42 + (b % 2) * bW * .14;
        const by = floorY - 8 - Math.floor(b / 2) * 8;
        g += `<rect x="${bx}" y="${by}" width="${bW * .12}" height="7" fill="${stone}" stroke="${r.col}" stroke-width=".5" opacity="${.7 + b * .07}"/>`;
        g += `<line x1="${bx + 2}" y1="${by + 3.5}" x2="${bx + bW * .12 - 2}" y2="${by + 3.5}" stroke="${r.col}" stroke-width=".2"/>`;
      }

      // a hoist — a-frame with rope over a suspended block
      g += `<line x1="${x + bW * .3}" y1="${floorY}" x2="${x + bW * .36}" y2="${bankY - 22}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .42}" y1="${floorY}" x2="${x + bW * .36}" y2="${bankY - 22}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .36}" y1="${bankY - 22}" x2="${x + bW * .36}" y2="${bankY - 12}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${bankY - 12}" width="${bW * .08}" height="7" fill="${stone}" stroke="${r.col}" stroke-width=".5"/>`;

      // chisels and mallet — tools on the banker
      g += `<line x1="${x + bW * .16}" y1="${bankY}" x2="${x + bW * .22}" y2="${bankY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .18}" y="${bankY - 10}" width="5" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // stone dust — small dots
      for (let d = 0; d < 4; d++) {
        g += `<circle cx="${x - bW * .06 + d * 3}" cy="${bankY - 11}" r=".7" fill="var(--muted)" opacity=".5"/>`;
      }

      // stonecutter chiselling for live sessions — figure at the banker
      if (r.live) {
        g += `<g class="stc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .16} ${bankY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
          <rect x="9" y="8" width="4" height="3" rx="1" fill="${stone}" stroke="${r.col}" stroke-width=".5"/>
        </g>`;
      }
      // split block — a fracture on errors
      if (r.err) g += `<path d="M ${x - bW * .02} ${bankY - 10} l -3 4 4 3 -3 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="stc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="stc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石场", eyebrow: "PROVIDER STONECUTTER", render };
})();
