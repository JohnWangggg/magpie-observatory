/* ------------------------------------------------------------------ basketry
 * Basketry view — a row of basket frames, one per provider.
 * Weavers woven up the sides = tokens; a weaver threading
 * for live sessions; a broken stake marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "basketry";
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
    if (!rows.length) { host.innerHTML = `<div class="bk-empty">暂无编篮坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const reed = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a860" : "#987848";
      const basW = seg * .4;
      const basY = floorY - 30;
      const basH = 26;
      // the basket — a flared bowl outline
      g += `<path d="M ${x - basW * .3} ${floorY} L ${x - basW * .44} ${basY} L ${x + basW * .44} ${basY} L ${x + basW * .3} ${floorY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // stakes — vertical ribs of the basket frame
      for (let s = -2; s <= 2; s++) {
        const frac = s / 2.0;
        const bx = x + frac * basW * .3;
        const tx = x + frac * basW * .44;
        g += `<line x1="${bx}" y1="${floorY}" x2="${tx}" y2="${basY}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      }
      // weavers — horizontal woven courses, count by tokens
      const courses = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < courses; c++) {
        const cy = floorY - 4 - c * ((basH - 6) / 4);
        const half = basW * .3 + (basW * .14) * (1 - (floorY - cy) / basH);
        g += `<line x1="${x - half}" y1="${cy}" x2="${x + half}" y2="${cy}" stroke="${c === 0 && r.err ? "var(--red)" : reed}" stroke-width="1.5"/>`;
        // weave texture — short ticks between stakes
        for (let t = 0; t < 3; t++) {
          g += `<line x1="${x - half + t * half}" y1="${cy - 1}" x2="${x - half + t * half + 2}" y2="${cy + 1}" stroke="${reed}" stroke-width=".5" opacity=".6"/>`;
        }
      }
      // the rim — the top border of the basket
      g += `<line x1="${x - basW * .44}" y1="${basY}" x2="${x + basW * .44}" y2="${basY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // cane bundle — loose weavers beside the basket
      const canes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < canes; c++) {
        g += `<line x1="${x - basW * .6 - c * 3}" y1="${floorY}" x2="${x - basW * .56 - c * 3}" y2="${floorY - 16}" stroke="${reed}" stroke-width="1"/>`;
      }
      // weaver threading for live sessions — figure weaving a course
      if (r.live) {
        g += `<g class="bk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + basW * .4} ${basY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="8" x2="-13" y2="10" stroke="${r.col}" stroke-width="1.1"/>
          <line x1="-13" y1="10" x2="-16" y2="6" stroke="${reed}" stroke-width=".9"/>
        </g>`;
      }
      // broken stake — a snapped rib on errors
      if (r.err) g += `<path d="M ${x - basW * .15} ${basY + 4} l 4 ${basH * .5}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "编篮坊", eyebrow: "PROVIDER BASKETRY", render };
})();
