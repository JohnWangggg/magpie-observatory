/* ----------------------------------------------------------------- gunsmith
 * Gunsmith view — a row of gunsmiths' shops, one per provider.
 * Pieces racked on the wall = tokens; a gunsmith filing a lock
 * for live sessions; a burst barrel marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gunsmith";
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
    if (!rows.length) { host.innerHTML = `<div class="gsm-empty">暂无铳坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — workshop boards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const benchY = floorY - 14;
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8898a8" : "#586878";
      const wood = "#7a5230";

      // the gun rack — a rail with muskets, count by tokens
      g += `<line x1="${x - bW * .4}" y1="${benchY - 22}" x2="${x + bW * .04}" y2="${benchY - 22}" stroke="${r.col}" stroke-width="1"/>`;
      const guns = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < guns; m++) {
        const mx = x - bW * .36 + m * bW * .14;
        // a musket — barrel, lock, stock
        g += `<line x1="${mx}" y1="${benchY - 22}" x2="${mx + bW * .02}" y2="${floorY - 10}" stroke="${m === 0 && r.err ? "var(--red)" : iron}" stroke-width="1.6"/>`;
        g += `<path d="M ${mx + bW * .02} ${floorY - 10} q 4 2 5 8 l -4 2 q -3 -6 -1 -10 z" fill="${wood}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<rect x="${mx + bW * .008}" y="${floorY - 16}" width="3" height="3" fill="${iron}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // the bench — with a vice
      g += `<rect x="${x - bW * .06}" y="${benchY}" width="${bW * .44}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .1}" y="${benchY + 5}" width="5" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .32}" y="${benchY + 5}" width="5" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // the vice — jaws on the bench edge
      g += `<rect x="${x - bW * .04}" y="${benchY - 6}" width="8" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .04}" y1="${benchY - 3}" x2="${x + bW * .02}" y2="${benchY - 3}" stroke="${r.col}" stroke-width=".5"/>`;
      // a barrel blank in the vice
      g += `<rect x="${x + bW * .02}" y="${benchY - 8}" width="${bW * .12}" height="3" fill="${iron}" stroke="${r.col}" stroke-width=".4"/>`;
      // a file — lying on the bench
      g += `<line x1="${x + bW * .2}" y1="${benchY - 2}" x2="${x + bW * .3}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .3}" y="${benchY - 6}" width="4" height="2" rx="1" fill="${wood}" stroke="${r.col}" stroke-width=".4"/>`;

      // a lock plate — on a stand, being worked
      g += `<path d="M ${x + bW * .36} ${benchY - 10} q 4 -3 8 0 l -1 4 h -6 z" fill="${iron}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x + bW * .4}" cy="${benchY - 8}" r="1" fill="${r.col}"/>`;
      g += `<line x1="${x + bW * .4}" y1="${benchY - 8}" x2="${x + bW * .42}" y2="${benchY - 11}" stroke="${r.col}" stroke-width=".4"/>`;

      // a powder horn — hanging
      g += `<path d="M ${x - bW * .42} ${floorY - 20} q 6 -3 8 2 q -2 5 -8 3 z" fill="${wood}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .42}" y1="${floorY - 20}" x2="${x - bW * .42}" y2="${floorY - 24}" stroke="${r.col}" stroke-width=".5"/>`;

      // ramrods — leaning bundle
      for (let rr = 0; rr < 3; rr++) {
        g += `<line x1="${x + bW * .44 + rr * 2}" y1="${floorY}" x2="${x + bW * .42 + rr * 2}" y2="${benchY - 18}" stroke="${r.col}" stroke-width=".5"/>`;
      }

      // gunsmith filing for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="gsm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .1} ${benchY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="10" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="-8" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // burst barrel — a split tube on errors
      if (r.err) g += `<path d="M ${x - bW * .36} ${benchY - 20} l 4 3 -3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="gsm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gsm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铳坊", eyebrow: "PROVIDER GUNSMITH", render };
})();
