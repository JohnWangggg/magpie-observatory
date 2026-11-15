/* ------------------------------------------------------------------ skinner
 * Skinner view — a row of fleshing beams, one per provider.
 * Hides worked on the beam = tokens; a skinner fleshing
 * a hide for live sessions; a scored hide marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "skinner";
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
    if (!rows.length) { host.innerHTML = `<div class="sk-empty">暂无剥皮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const beamY = floorY - 12;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the fleshing beam — a sloped board on legs
      g += `<rect x="${x - bW * .34}" y="${beamY - 14}" width="${bW * .42}" height="10" rx="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .3}" y1="${beamY - 4}" x2="${x - bW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .04}" y1="${beamY - 4}" x2="${x + bW * .04}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      // a hide draped over the beam — being fleshed
      g += `<path d="M ${x - bW * .3} ${beamY - 14} q 6 -4 12 0 q 6 4 12 0 l 0 10 q -6 4 -12 0 q -6 -4 -12 0 z" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
      // a fleshing knife — a two-handled blade
      g += `<path d="M ${x + bW * .1} ${beamY - 8} q 6 -4 10 0 q -2 4 -10 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .1}" y1="${beamY - 8}" x2="${x + bW * .1}" y2="${beamY - 12}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .2}" y1="${beamY - 8}" x2="${x + bW * .2}" y2="${beamY - 12}" stroke="${r.col}" stroke-width=".7"/>`;
      // folded hides — stacked on the floor, count by tokens
      const folds = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < folds; f++) {
        const fx = x + bW * .18 + f * bW * .08;
        g += `<rect x="${fx - 4}" y="${floorY - 5 - (f % 2) * 3}" width="8" height="4" rx="1" fill="${f === 0 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a bucket — a salt or water pail
      g += `<rect x="${x - bW * .44}" y="${floorY - 6}" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .4}" cy="${floorY - 3}" rx="3" ry="1.5" fill="#c8b898" stroke="${r.col}" stroke-width=".4"/>`;
      // a stretching frame behind with a hide
      g += `<rect x="${x + bW * .28}" y="${floorY - 26}" width="${bW * .16}" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .3} ${floorY - 24} q 3 -3 6 0 q 3 3 6 0 l 0 10 q -3 3 -6 0 q -3 -3 -6 0 z" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".6"/>`;
      // skinner fleshing for live sessions — figure at the beam
      if (r.live) {
        g += `<g class="sk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${beamY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scored hide — a cut on the leather on errors
      if (r.err) g += `<path d="M ${x - bW * .24} ${beamY - 10} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="sk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "剥皮", eyebrow: "PROVIDER SKINNER", render };
})();
