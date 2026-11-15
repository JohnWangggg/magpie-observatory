/* ------------------------------------------------------------------- cutler
 * Cutler view — a row of grinding stalls, one per provider.
 * Blades racked at the stall = tokens; a cutler treadling
 * the grindstone for live sessions; a snapped blade marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cutler";
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
    if (!rows.length) { host.innerHTML = `<div class="ctl-empty">暂无刀坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — workshop boards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wheelY = floorY - 16;
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a8b8c8" : "#687888";

      // the treadle frame — posts and an axle
      g += `<rect x="${x - bW * .32}" y="${wheelY - 8}" width="5" height="24" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .02}" y="${wheelY - 8}" width="5" height="24" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .32}" y1="${wheelY}" x2="${x + bW * .03}" y2="${wheelY}" stroke="${r.col}" stroke-width=".7"/>`;
      // the grindstone — a disc on the axle
      g += `<circle cx="${x - bW * .145}" cy="${wheelY}" r="9" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x - bW * .145}" cy="${wheelY}" r="5.5" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x - bW * .145}" cy="${wheelY}" r="1.4" fill="${r.col}"/>`;
      // a spark — a small streak off the wheel
      g += `<path d="M ${x - bW * .08} ${wheelY - 6} l 5 -3 M ${x - bW * .07} ${wheelY - 3} l 4 -1" stroke="#ffd23a" stroke-width=".7" fill="none" opacity=".8"/>`;
      // the treadle — a foot bar below
      g += `<line x1="${x - bW * .28}" y1="${floorY - 4}" x2="${x - bW * .1}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .19}" y1="${floorY - 5}" x2="${x - bW * .19}" y2="${wheelY + 8}" stroke="${r.col}" stroke-width=".6"/>`;
      // a trough — water for the wheel
      g += `<rect x="${x - bW * .2}" y="${wheelY + 8}" width="${bW * .12}" height="6" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;

      // a blade rack — a rail with hung blades, count by tokens
      g += `<line x1="${x + bW * .14}" y1="${wheelY - 20}" x2="${x + bW * .14}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .4}" y1="${wheelY - 20}" x2="${x + bW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .1}" y1="${wheelY - 20}" x2="${x + bW * .44}" y2="${wheelY - 20}" stroke="${r.col}" stroke-width="1"/>`;
      const blades = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < blades; b++) {
        const bx = x + bW * .15 + b * bW * .08;
        // a knife — blade + haft
        g += `<path d="M ${bx} ${wheelY - 18} l ${bW * .03} 2 l -1 9 l -2 -9 z" fill="${b === 0 && r.err ? "var(--red)" : steel}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<rect x="${bx - 1}" y="${wheelY - 9}" width="${bW * .03 + 1}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a barrel of hilts — beside the rack
      g += `<path d="M ${x + bW * .42} ${floorY} l -2 -10 h 8 l -2 10 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 10}" rx="4" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;

      // cutler treadling for live sessions — figure at the wheel
      if (r.live) {
        g += `<g class="ctl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .42} ${wheelY - 12})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="12" y2="4" stroke="${r.col}" stroke-width="1"/>
          <line x1="1" y1="12" x2="8" y2="16" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snapped blade — a broken edge on errors
      if (r.err) g += `<path d="M ${x + bW * .17} ${wheelY - 18} l 3 5 -3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="ctl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ctl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "刀坊", eyebrow: "PROVIDER CUTLER", render };
})();
