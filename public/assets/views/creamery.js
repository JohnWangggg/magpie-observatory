/* ------------------------------------------------------------------ creamery
 * Creamery view — a row of butter churns, one per provider.
 * Butter pats stamped on the slab = tokens; a dairymaid
 * plunging the dasher for live sessions; a split churn marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "creamery";
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
    if (!rows.length) { host.innerHTML = `<div class="crm-empty">暂无乳酪坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // dairy floor — cool stone slabs
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let st = 1; st < 8; st++) g += `<line x1="${st * W / 8}" y1="${floorY}" x2="${st * W / 8}" y2="${H}" stroke="var(--line)" stroke-width=".5" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const cream = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0e0a8" : "#c8b070";
      const chW = seg * .3;
      const chY = floorY - 34;
      const chH = 32;
      // the plunge churn — a staved barrel with hoops
      g += `<path d="M ${x - chW / 2} ${chY} L ${x - chW * .42} ${floorY - 2} L ${x + chW * .42} ${floorY - 2} L ${x + chW / 2} ${chY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<ellipse cx="${x}" cy="${chY + 3}" rx="${chW / 2}" ry="4" fill="${cream}" stroke="${r.col}" stroke-width=".9"/>`;
      // hoops
      g += `<path d="M ${x - chW * .48} ${chY + chH * .4} L ${x + chW * .48} ${chY + chH * .4}" stroke="${r.col}" stroke-width="1" opacity=".7"/>`;
      g += `<path d="M ${x - chW * .45} ${chY + chH * .75} L ${x + chW * .45} ${chY + chH * .75}" stroke="${r.col}" stroke-width="1" opacity=".7"/>`;
      // staves
      for (let sv = -1; sv <= 1; sv++) g += `<line x1="${x + sv * chW * .18}" y1="${chY + 4}" x2="${x + sv * chW * .16}" y2="${floorY - 3}" stroke="${r.col}" stroke-width=".5" opacity=".5"/>`;
      // the dasher — a plunger stick rising from the lid
      g += `<line x1="${x}" y1="${chY + 2}" x2="${x}" y2="${chY - 12}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<circle cx="${x}" cy="${chY - 13}" r="2.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // butter pats stamped on a marble slab, count by tokens
      const pats = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      g += `<rect x="${x + chW * .55}" y="${floorY - 8}" width="${chW * .5}" height="4" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      for (let p = 0; p < pats; p++) {
        g += `<rect x="${x + chW * .57 + p * chW * .11}" y="${floorY - 14}" width="${chW * .09}" height="6" rx="1.4" fill="${p === 0 && r.err ? "var(--red)" : cream}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // milk can beside
      g += `<path d="M ${x - chW * .85} ${floorY - 2} v -10 a 4 3 0 0 1 8 0 v 10 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // dairymaid plunging for live sessions
      if (r.live) {
        g += `<g class="crm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - 9} ${chY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="9" y2="14" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // split churn — a cracked stave on errors
      if (r.err) g += `<path d="M ${x - chW * .2} ${chY + 8} l 4 6 l -3 5" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="crm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="crm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "乳酪坊", eyebrow: "PROVIDER CREAMERY", render };
})();
