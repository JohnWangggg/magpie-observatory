/* --------------------------------------------------------------- embroiderer
 * Embroiderer view — a row of hoop frames, one per provider.
 * Threads stitched on the cloth = tokens; an embroiderer
 * working a motif for live sessions; a snapped thread marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "embroiderer";
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
    if (!rows.length) { host.innerHTML = `<div class="emb-empty">暂无绣坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const hoopY = floorY - 24;
      const thread = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a8a8a" : "#3a5a5c";
      // the hoop — two rings clamped on a stand
      g += `<circle cx="${x}" cy="${hoopY}" r="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x}" cy="${hoopY}" r="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // a screw at the top of the hoop
      g += `<rect x="${x - 1.5}" y="${hoopY - 14}" width="3" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x}" y1="${hoopY - 14}" x2="${x}" y2="${hoopY - 18}" stroke="${r.col}" stroke-width=".7"/>`;
      // a stand — a post and base
      g += `<line x1="${x}" y1="${hoopY + 12}" x2="${x}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - 10}" y="${floorY - 4}" width="20" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // stitched threads — arcs inside the hoop, count by tokens
      const stitches = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < stitches; s++) {
        const sy = hoopY - 4 + s * 2.4;
        g += `<path d="M ${x - 6} ${sy} q 6 -4 12 0" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : thread}" stroke-width=".8"/>`;
      }
      // a motif — a flower shape on the cloth
      g += `<circle cx="${x + 2}" cy="${hoopY + 2}" r="3" fill="${r.err ? "var(--red)" : thread}" stroke="${r.col}" stroke-width=".5"/>`;
      for (let p = 0; p < 5; p++) {
        const a = p * Math.PI * 2 / 5;
        g += `<line x1="${x + 2 + Math.cos(a) * 3}" y1="${hoopY + 2 + Math.sin(a) * 3}" x2="${x + 2 + Math.cos(a) * 5}" y2="${hoopY + 2 + Math.sin(a) * 5}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // thread spools — a bobbin and skein beside
      g += `<ellipse cx="${x - bW * .3}" cy="${floorY - 4}" rx="4" ry="3" fill="${thread}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .3} ${floorY - 4} q 4 -4 8 -2" fill="none" stroke="${thread}" stroke-width=".6"/>`;
      // a needle — a fine line with an eye
      g += `<line x1="${x + bW * .3}" y1="${floorY - 6}" x2="${x + bW * .32}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .32}" cy="${floorY - 13}" r=".9" fill="none" stroke="${r.col}" stroke-width=".4"/>`;
      // a pattern card — a small sheet with a design
      g += `<rect x="${x - bW * .42}" y="${floorY - 8}" width="${bW * .16}" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .42}" y1="${floorY - 6}" x2="${x - bW * .26}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".3"/>`;
      g += `<line x1="${x - bW * .42}" y1="${floorY - 3}" x2="${x - bW * .3}" y2="${floorY - 3}" stroke="${r.col}" stroke-width=".3"/>`;
      // embroiderer working for live sessions — figure at the hoop
      if (r.live) {
        g += `<g class="emb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${hoopY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snapped thread — a loose end on errors
      if (r.err) g += `<path d="M ${x - 6} ${hoopY - 2} q 4 6 8 2" fill="none" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="1.5 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="emb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="emb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绣坊", eyebrow: "PROVIDER EMBROIDERER", render };
})();
