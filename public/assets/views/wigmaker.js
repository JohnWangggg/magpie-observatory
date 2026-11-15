/* ----------------------------------------------------------------- wigmaker
 * Wigmaker view — a row of wig blocks, one per provider.
 * Perukes on the stands = tokens; a wigmaker knotting
 * for live sessions; a frayed curl marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wigmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="wgm-empty">暂无假发坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a parlour floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const hair = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a878" : "#887050";

      // the block — a head on a stand
      const headY = floorY - 26;
      g += `<line x1="${x - bW * .2}" y1="${floorY}" x2="${x - bW * .2}" y2="${headY + 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x - bW * .2}" cy="${floorY}" rx="5" ry="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .2}" cy="${headY}" r="6.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // the peruke — curls on the head
      const curls = Math.min(5, 2 + Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < curls; c++) {
        const a = Math.PI * (.85 + c * .26);
        const cx = x - bW * .2 + Math.cos(a) * 6.5;
        const cy = headY + Math.sin(a) * 6.5;
        g += `<circle cx="${cx}" cy="${cy}" r="2.6" fill="${c === 0 && r.err ? "var(--red)" : hair}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a top knot
      g += `<circle cx="${x - bW * .2}" cy="${headY - 7}" r="2.8" fill="${hair}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x - bW * .2} ${headY - 8} q -2 -4 1 -5" fill="none" stroke="${r.col}" stroke-width=".5"/>`;

      // a second stand — a shelf of heads, count by tokens
      const heads = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < heads; h++) {
        const hx = x + bW * .1 + h * bW * .14;
        const hy = floorY - 20;
        g += `<line x1="${hx}" y1="${floorY}" x2="${hx}" y2="${hy + 5}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<ellipse cx="${hx}" cy="${floorY}" rx="4" ry="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${hx}" cy="${hy}" r="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${hx - 4} ${hy - 2} q 4 -5 8 0 q -2 3 -4 3 q -2 0 -4 -3 z" fill="${h === 0 && r.err ? "var(--red)" : hair}" stroke="${r.col}" stroke-width=".5"/>`;
      }

      // a work-table — with a knotting frame
      g += `<rect x="${x - bW * .44}" y="${floorY - 8}" width="${bW * .16}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x - bW * .42}" y="${floorY - 16}" width="${bW * .12}" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x - bW * .41 + t * 3}" y1="${floorY - 16}" x2="${x - bW * .41 + t * 3}" y2="${floorY - 8}" stroke="${hair}" stroke-width=".5"/>`;
      }
      // a powder puff — beside the table
      g += `<circle cx="${x - bW * .42}" cy="${floorY - 20}" r="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x - bW * .42}" cy="${floorY - 22}" r="1" fill="${hair}"/>`;

      // wigmaker knotting for live sessions — figure at the block
      if (r.live) {
        g += `<g class="wgm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .02} ${headY - 16})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="-8" y2="10" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // frayed curl — a loose strand on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${headY - 9} q 4 -4 6 0 q -3 3 -6 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="wgm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wgm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "假发坊", eyebrow: "PROVIDER WIGMAKER", render };
})();
