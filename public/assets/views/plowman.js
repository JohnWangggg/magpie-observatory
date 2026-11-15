/* ------------------------------------------------------------------ plowman
 * Plowman view — a row of furrowed fields, one per provider.
 * Furrows turned in the field = tokens; a plowman driving
 * the plough for live sessions; a bent share marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "plowman";
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
    if (!rows.length) { host.innerHTML = `<div class="plw-empty">暂无犁田</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const earth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a6848" : "#5a4030";

      // furrows — turned ridges receding, count by tokens
      const furs = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let f = 0; f < furs; f++) {
        const fy = floorY - 4 - f * 6;
        const inset = f * 6;
        g += `<path d="M ${x - bW * .42 + inset} ${fy} q ${bW * .21} -4 ${bW * .42} 0"
          fill="none" stroke="${f === furs - 1 && r.err ? "var(--red)" : earth}" stroke-width="2.4" stroke-linecap="round" opacity="${.6 + f * .08}"/>`;
      }
      // the plough — beam, share, handles
      g += `<line x1="${x - bW * .1}" y1="${floorY - 14}" x2="${x + bW * .14}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<path d="M ${x - bW * .1} ${floorY - 14} l 6 6 8 -2 -4 -5 z" fill="${earth}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .06}" y1="${floorY - 18}" x2="${x + bW * .1}" y2="${floorY - 26}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .12}" y1="${floorY - 19}" x2="${x + bW * .18}" y2="${floorY - 25}" stroke="${r.col}" stroke-width="1"/>`;
      // a coulter — the cutting disc
      g += `<circle cx="${x - bW * .02}" cy="${floorY - 12}" r="3" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // oxen — two yoked beasts ahead
      g += `<ellipse cx="${x + bW * .3}" cy="${floorY - 22}" rx="8" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 20}" rx="8" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${floorY - 28}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .5}" cy="${floorY - 26}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .34} ${floorY - 30} l -2 -3 M ${x + bW * .38} ${floorY - 30} l 2 -3 M ${x + bW * .48} ${floorY - 28} l -2 -3 M ${x + bW * .52} ${floorY - 28} l 2 -3" stroke="${r.col}" stroke-width=".6" fill="none"/>`;
      // the yoke — a bar across their necks
      g += `<line x1="${x + bW * .32}" y1="${floorY - 26}" x2="${x + bW * .52}" y2="${floorY - 24}" stroke="${r.col}" stroke-width="1.4"/>`;
      // traces — lines back to the plough
      g += `<line x1="${x + bW * .26}" y1="${floorY - 22}" x2="${x + bW * .14}" y2="${floorY - 20}" stroke="${r.col}" stroke-width=".6"/>`;
      // a seed basket — on the beam
      g += `<path d="M ${x + bW * .02} ${floorY - 20} l 2 -5 h 4 l 2 5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // plowman driving for live sessions — figure at the handles
      if (r.live) {
        g += `<g class="plw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .18} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // bent share — a warped ploughshare on errors
      if (r.err) g += `<path d="M ${x - bW * .08} ${floorY - 10} q 4 4 8 2" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="plw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="plw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "犁田", eyebrow: "PROVIDER PLOWMAN", render };
})();
