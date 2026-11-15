/* ------------------------------------------------------------------ cowherd
 * Cowherd view — a row of pasture folds, one per provider.
 * Cows on the lea = tokens; a cowherd driving
 * for live sessions; a strayed calf marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cowherd";
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
    if (!rows.length) { host.innerHTML = `<div class="cwh-empty">暂无牧地</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a88868" : "#685038";

      // the lea — a grassy fold with a pond
      g += `<ellipse cx="${x + bW * .3}" cy="${floorY - 2}" rx="${bW * .14}" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .3}" cy="${floorY - 2.5}" rx="${bW * .1}" ry="2" fill="var(--card-2)"/>`;
      // grass tufts
      for (let t = 0; t < 6; t++) {
        g += `<path d="M ${x - bW * .4 + t * bW * .13} ${floorY} q 1 -4 2 0 M ${x - bW * .4 + t * bW * .13 + 2} ${floorY} q 1 -5 2 0" fill="none" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      }

      // cows — grazing beasts, count by tokens
      const cows = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cows; c++) {
        const cx = x - bW * .32 + c * bW * .18;
        const cy = floorY - 10;
        const down = c === 1; // one grazing, head down
        g += `<ellipse cx="${cx}" cy="${cy}" rx="9" ry="5.5" fill="${c === cows - 1 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<circle cx="${cx + (down ? 8 : -8)}" cy="${cy + (down ? 3 : -4)}" r="3" fill="${hide}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${cx + (down ? 7 : -9)} ${cy + (down ? 1 : -7)} l -2 -2 M ${cx + (down ? 9 : -7)} ${cy + (down ? 1 : -7)} l 2 -2" stroke="${r.col}" stroke-width=".5" fill="none"/>`;
        g += `<line x1="${cx - 4}" y1="${cy + 5}" x2="${cx - 4}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<line x1="${cx + 4}" y1="${cy + 5}" x2="${cx + 4}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<path d="M ${cx - 9} ${cy - 2} q -3 2 -3 6" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
        // a tail swish
        g += `<line x1="${cx - 9}" y1="${cy}" x2="${cx - 11}" y2="${cy + 5}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a calf — small one by the pond
      g += `<ellipse cx="${x + bW * .36}" cy="${floorY - 6}" rx="5" ry="3" fill="${hide}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .4}" cy="${floorY - 8}" r="2" fill="${hide}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .34}" y1="${floorY - 3}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width=".7"/>`;

      // a gate — the fold entrance
      g += `<rect x="${x - bW * .44}" y="${floorY - 18}" width="4" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x - bW * .44}" y="${floorY - 16}" width="${bW * .14}" height="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x - bW * .44}" y="${floorY - 10}" width="${bW * .14}" height="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .44}" y1="${floorY - 16}" x2="${x - bW * .3}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;
      // a horn — the herder's call
      g += `<path d="M ${x + bW * .44} ${floorY - 14} q 4 -2 5 2 q -2 3 -5 1 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .44}" y1="${floorY - 14}" x2="${x + bW * .44}" y2="${floorY}" stroke="${r.col}" stroke-width=".5"/>`;
      // a switch — a driving stick
      g += `<line x1="${x - bW * .02}" y1="${floorY}" x2="${x + bW * .01}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + bW * .01} ${floorY - 14} q 3 -2 4 1" fill="none" stroke="${r.col}" stroke-width=".7"/>`;

      // cowherd driving for live sessions — figure behind the cows
      if (r.live) {
        g += `<g class="cwh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${floorY - 28})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="3" x2="11" y2="-3" stroke="${r.col}" stroke-width="1"/>
          <path d="M 11 -3 l 3 -1 M 11 -3 l 3 2" stroke="${r.col}" stroke-width=".5" fill="none"/>
        </g>`;
      }
      // strayed calf — off by the gate on errors
      if (r.err) g += `<ellipse cx="${x - bW * .4}" cy="${floorY - 8}" rx="4" ry="2.5" fill="var(--red)" stroke="${r.col}" stroke-width=".5"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cwh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cwh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "牧地", eyebrow: "PROVIDER COWHERD", render };
})();
