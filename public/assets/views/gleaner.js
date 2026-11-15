/* ------------------------------------------------------------------ gleaner
 * Gleaner view — a row of harvested fields, one per provider.
 * Ears gathered into the apron = tokens; a gleaner bending
 * for live sessions; scattered ears mark errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gleaner";
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
    if (!rows.length) { host.innerHTML = `<div class="gln-empty">暂无拾穗</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const straw = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#987838";

      // stubble — cut stalks across the field
      for (let s = 0; s < 8; s++) {
        const sx = x - bW * .4 + s * bW * .1;
        g += `<line x1="${sx}" y1="${floorY}" x2="${sx}" y2="${floorY - 4 - (s % 3)}" stroke="${straw}" stroke-width=".8"/>`;
      }
      // a distant stook — left behind
      g += `<path d="M ${x + bW * .32} ${floorY} l -4 -14 q 4 -3 8 0 z" fill="${straw}" stroke="${r.col}" stroke-width=".5" opacity=".7"/>`;
      // ears on the ground — gleanings, count by tokens
      const ears = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let e = 0; e < ears; e++) {
        const ex = x - bW * .34 + e * bW * .1;
        const ey = floorY - 2 - (e % 2) * 3;
        g += `<line x1="${ex}" y1="${ey}" x2="${ex + 3}" y2="${ey - 4}" stroke="${e === ears - 1 && r.err ? "var(--red)" : straw}" stroke-width="1"/>`;
        g += `<ellipse cx="${ex + 3}" cy="${ey - 5}" rx="1.2" ry="2" fill="${e === ears - 1 && r.err ? "var(--red)" : straw}"/>`;
      }
      // a gathered bundle — tied sheaf
      g += `<path d="M ${x + bW * .1} ${floorY} l -3 -12 q 3 -3 6 0 z" fill="${straw}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .08}" y1="${floorY - 6}" x2="${x + bW * .12}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      // a basket — at the field edge
      g += `<path d="M ${x + bW * .22} ${floorY} l -3 -8 h 10 l -3 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .21} ${floorY - 8} q 5 -4 10 0" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x + bW * .23} ${floorY - 8} q 1 -2 2 0 M ${x + bW * .26} ${floorY - 8} q 1 -2 2 0" fill="none" stroke="${straw}" stroke-width=".6"/>`;

      // gleaner bending for live sessions — figure stooped
      if (r.live) {
        g += `<g class="gln-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${floorY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1" transform="rotate(20)"/>
          <line x1="4" y1="7" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scattered ears — lost grain on errors
      if (r.err) {
        for (let s = 0; s < 4; s++) {
          g += `<circle cx="${x - bW * .3 + s * 4}" cy="${floorY - 8 - s * 2}" r=".9" fill="var(--red)"/>`;
        }
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="gln-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gln-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拾穗", eyebrow: "PROVIDER GLEANER", render };
})();
