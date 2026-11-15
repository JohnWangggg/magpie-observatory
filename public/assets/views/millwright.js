/* -------------------------------------------------------------- millwright
 * Millwright view — a row of windmill frames, one per provider.
 * Sails bolted on the stock = tokens; a millwright setting
 * a sail for live sessions; a sprung spar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "millwright";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .9;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mwr-empty">暂无磨架</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a grassy bank
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .46;
      const millTop = floorY - 40;
      const timber = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a07850" : "#685038";

      // the mill — a tapered tower
      g += `<path d="M ${x - bW * .14} ${floorY} l 4 -40 h ${bW * .2} l 4 40 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x - bW * .1} ${millTop} q ${bW * .1} -8 ${bW * .2} 0" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // a door and a window
      g += `<rect x="${x - bW * .03}" y="${floorY - 8}" width="${bW * .06}" height="8" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x - bW * .02}" y="${floorY - 22}" width="${bW * .05}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;

      // the stocks — a cross of sails, count by tokens
      const hubX = x + bW * .01, hubY = millTop - 4;
      const sails = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < sails; s++) {
        const a = s * Math.PI / 2 + .4;
        const sx = hubX + Math.cos(a) * 16, sy = hubY + Math.sin(a) * 16;
        // a sail — spar + lattice
        g += `<line x1="${hubX}" y1="${hubY}" x2="${sx}" y2="${sy}" stroke="${s === sails - 1 && r.err ? "var(--red)" : timber}" stroke-width="1.6"/>`;
        const px = Math.cos(a + Math.PI / 2) * 3, py = Math.sin(a + Math.PI / 2) * 3;
        for (let l = 1; l <= 3; l++) {
          const t = l / 4;
          g += `<line x1="${hubX + (sx - hubX) * t - px}" y1="${hubY + (sy - hubY) * t - py}" x2="${hubX + (sx - hubX) * t + px}" y2="${hubY + (sy - hubY) * t + py}" stroke="${r.col}" stroke-width=".6"/>`;
        }
      }
      g += `<circle cx="${hubX}" cy="${hubY}" r="3" fill="${timber}" stroke="${r.col}" stroke-width=".8"/>`;

      // a ladder — up the tower side
      g += `<line x1="${x + bW * .14}" y1="${floorY}" x2="${x + bW * .1}" y2="${floorY - 24}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .18}" y1="${floorY}" x2="${x + bW * .14}" y2="${floorY - 24}" stroke="${r.col}" stroke-width=".8"/>`;
      for (let l = 0; l < 4; l++) {
        g += `<line x1="${x + bW * .14 + l * .006 * bW}" y1="${floorY - 4 - l * 5}" x2="${x + bW * .18 - l * .006 * bW}" y2="${floorY - 4 - l * 5}" stroke="${r.col}" stroke-width=".5"/>`;
      }

      // a spare sail — leaning
      g += `<line x1="${x - bW * .32}" y1="${floorY}" x2="${x - bW * .26}" y2="${floorY - 18}" stroke="${timber}" stroke-width="1.6"/>`;
      for (let l = 0; l < 3; l++) {
        g += `<line x1="${x - bW * .32 + l * 2}" y1="${floorY - 3 - l * 5}" x2="${x - bW * .32 + l * 2 + 6}" y2="${floorY - 2 - l * 5}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a stone — a millstone lying flat
      g += `<circle cx="${x + bW * .34}" cy="${floorY - 4}" r="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .34}" cy="${floorY - 4}" r="1.6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;

      // millwright setting for live sessions — figure on the stock
      if (r.live) {
        g += `<g class="mwr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${hubX + 8} ${hubY - 10})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-11" y2="4" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // sprung spar — a bent sail arm on errors
      if (r.err) {
        const a = (sails - 1) * Math.PI / 2 + .4;
        g += `<path d="M ${hubX + Math.cos(a) * 8} ${hubY + Math.sin(a) * 8} q 4 2 7 6" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="mwr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mwr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "磨架", eyebrow: "PROVIDER MILLWRIGHT", render };
})();
