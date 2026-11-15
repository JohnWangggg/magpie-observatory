/* ------------------------------------------------------------------- hunter
 * Hunter view — a row of forest edges, one per provider.
 * Game hung on the pole = tokens; a hunter drawing
 * the bow for live sessions; a broken snare marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hunter";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="hnt-empty">暂无猎场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const game = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a87858" : "#684838";

      // the wood edge — trees behind
      for (let t = 0; t < 3; t++) {
        const tx = x - bW * .42 + t * bW * .16;
        g += `<line x1="${tx}" y1="${floorY}" x2="${tx}" y2="${floorY - 18 - t * 4}" stroke="${r.col}" stroke-width="1.2"/>`;
        g += `<circle cx="${tx}" cy="${floorY - 22 - t * 4}" r="${6 - t}" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // bracken — fern tufts
      for (let f = 0; f < 4; f++) {
        g += `<path d="M ${x - bW * .36 + f * bW * .2} ${floorY} q 2 -6 4 -8 M ${x - bW * .35 + f * bW * .2} ${floorY} q 3 -4 5 -6" fill="none" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      }

      // the game pole — a carrying pole with hung game, count by tokens
      g += `<line x1="${x - bW * .06}" y1="${floorY - 26}" x2="${x - bW * .06}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .34}" y1="${floorY - 26}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .1}" y1="${floorY - 26}" x2="${x + bW * .38}" y2="${floorY - 26}" stroke="${r.col}" stroke-width="1.2"/>`;
      const quarry = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let q = 0; q < quarry; q++) {
        const qx = x - bW * .02 + q * bW * .1;
        const small = q % 2; // rabbits vs deer
        g += `<line x1="${qx}" y1="${floorY - 26}" x2="${qx}" y2="${floorY - 20}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<ellipse cx="${qx}" cy="${floorY - 16}" rx="${small ? 2.5 : 4}" ry="${small ? 3.5 : 5}" fill="${q === quarry - 1 && r.err ? "var(--red)" : game}" stroke="${r.col}" stroke-width=".5"/>`;
        if (!small) {
          g += `<path d="M ${qx - 2} ${floorY - 20} l -2 -4 M ${qx - 1} ${floorY - 20} l -1 -4" stroke="${r.col}" stroke-width=".4" fill="none"/>`;
        }
      }
      // a snare — a wire loop on the ground
      g += `<ellipse cx="${x - bW * .3}" cy="${floorY - 3}" rx="4" ry="2" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .3}" y1="${floorY - 1}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".6"/>`;
      // a quiver — leaning
      g += `<rect x="${x - bW * .44}" y="${floorY - 14}" width="5" height="12" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let a = 0; a < 3; a++) {
        g += `<line x1="${x - bW * .43 + a * 1.5}" y1="${floorY - 14}" x2="${x - bW * .43 + a * 1.5}" y2="${floorY - 18}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a horn — a hunting horn
      g += `<path d="M ${x + bW * .4} ${floorY - 6} q 6 -3 7 2 q -3 3 -7 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a leash — for a hound
      g += `<ellipse cx="${x + bW * .16}" cy="${floorY - 4}" rx="4" ry="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x + bW * .19}" cy="${floorY - 6}" r="1.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;

      // hunter drawing for live sessions — figure with a bow
      if (r.live) {
        g += `<g class="hnt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .16} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M 4 2 q 8 3 8 10" fill="none" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="4" x2="12" y2="7" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // broken snare — a sprung loop on errors
      if (r.err) g += `<path d="M ${x - bW * .3} ${floorY - 3} l 4 -4 M ${x - bW * .26} ${floorY - 3} l -4 -4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="hnt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hnt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "猎场", eyebrow: "PROVIDER HUNTER", render };
})();
