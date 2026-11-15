/* --------------------------------------------------------------------- besom
 * Besom view — a row of broom-tying benches, one per provider.
 * Birch twigs bound on the ash handle = tokens; a broom-maker
 * wiring the bundle for live sessions; a shed bundle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "besom";
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
    if (!rows.length) { host.innerHTML = `<div class="bsm-empty">暂无扫帚坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const twig = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b08858" : "#685840";
      const bW = seg * .38;
      // the tying bench — a low plank
      g += `<rect x="${x - bW / 2}" y="${floorY - 10}" width="${bW}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x - bW * .4}" y1="${floorY - 6}" x2="${x - bW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .4}" y1="${floorY - 6}" x2="${x + bW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      // the besom being made — an ash handle with birch twigs fanning
      g += `<line x1="${x - bW * .28}" y1="${floorY - 12}" x2="${x + bW * .2}" y2="${floorY - 34}" stroke="${r.col}" stroke-width="1.6"/>`;
      // twig bundle at the thick end — fan of strokes
      for (let t = 0; t < 5; t++) {
        g += `<line x1="${x - bW * .28}" y1="${floorY - 12}" x2="${x - bW * .44 + t * bW * .09}" y2="${floorY - 4 - t * 2}" stroke="${t === 0 && r.err ? "var(--red)" : twig}" stroke-width="1.2"/>`;
      }
      // binding wires around the bundle
      g += `<path d="M ${x - bW * .32} ${floorY - 13} q 4 -3 8 -2" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - bW * .3} ${floorY - 10} q 4 -3 8 -2" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // finished besoms leaning on a rack — count by tokens
      g += `<line x1="${x + bW * .62}" y1="${floorY}" x2="${x + bW * .62}" y2="${floorY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .5}" y1="${floorY - 26}" x2="${x + bW * .74}" y2="${floorY - 26}" stroke="${r.col}" stroke-width="1"/>`;
      const besoms = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < besoms; b++) {
        const bx = x + bW * .52 + b * bW * .09;
        g += `<line x1="${bx}" y1="${floorY - 26}" x2="${bx - 3}" y2="${floorY - 2}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<path d="M ${bx - 3} ${floorY - 2} q -3 -6 -1 -9 l 5 0 q 2 3 -1 9" fill="${b === 0 && r.err ? "var(--red)" : twig}" opacity=".85"/>`;
      }
      // a pile of cut twigs beside
      for (let p = 0; p < 4; p++) {
        g += `<line x1="${x - bW * .64 + p * 3}" y1="${floorY - 2 - (p % 2) * 2}" x2="${x - bW * .6 + p * 3}" y2="${floorY - 6 - (p % 2) * 2}" stroke="${twig}" stroke-width="1" opacity=".7"/>`;
      }
      // a wire coil
      g += `<circle cx="${x + bW * .32}" cy="${floorY - 4}" r="3.4" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x + bW * .32}" cy="${floorY - 4}" r="1.8" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // broom-maker wiring for live sessions
      if (r.live) {
        g += `<g class="bsm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .52} ${floorY - 30})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="11" y2="14" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // shed bundle — scattered twigs on errors
      if (r.err) {
        for (let s = 0; s < 3; s++) {
          g += `<line x1="${x - bW * .2 + s * 4}" y1="${floorY - 2}" x2="${x - bW * .18 + s * 4}" y2="${floorY - 5}" stroke="var(--red)" stroke-width=".9"/>`;
        }
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bsm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bsm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "扫帚坊", eyebrow: "PROVIDER BESOM", render };
})();
