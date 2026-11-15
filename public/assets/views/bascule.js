/* ------------------------------------------------------------------ bascule
 * Bascule view — a row of rolling-lift bridges, one per provider.
 * Leaf raise angle = tokens; a bridgemaster at the quadrant for
 * live sessions; a jammed trunnion marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bascule";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const pierY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bs-empty">暂无开启桥</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water below the piers
    g += `<rect y="${pierY}" width="${W}" height="${H - pierY}" fill="#1e3348" opacity=".5"/>`;
    for (let x = 0; x < W; x += 30) g += `<path d="M ${x} ${pierY + 8} q 8 -4 16 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const leafL = seg * .62;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const raise = (r.tok / maxTok) * 62; // degrees — busier leaf stands higher
      // two stone piers
      g += `<rect x="${x - leafL / 2 - 8}" y="${pierY - 14}" width="12" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x + leafL / 2 - 4}" y="${pierY - 14}" width="12" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // hinge point on the left pier
      const hx = x - leafL / 2 + 2, hy = pierY - 16;
      // leaf — a trussed deck rotated about the hinge
      const rad = -raise * Math.PI / 180;
      const tipX = hx + leafL * Math.cos(rad);
      const tipY = hy + leafL * Math.sin(rad);
      g += `<line x1="${hx}" y1="${hy}" x2="${tipX.toFixed(0)}" y2="${tipY.toFixed(0)}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // top chord of the truss, parallel
      const offX = -Math.sin(rad) * 7, offY = Math.cos(rad) * 7;
      g += `<line x1="${(hx + offX).toFixed(0)}" y1="${(hy + offY).toFixed(0)}" x2="${(tipX + offX).toFixed(0)}" y2="${(tipY + offY).toFixed(0)}" stroke="${r.col}" stroke-width="1.2" opacity=".7"/>`;
      // trunnion + counterweight quadrant behind the hinge
      g += `<circle cx="${hx}" cy="${hy}" r="4" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="2 2"' : ""}/>`;
      g += `<path d="M ${hx - 2} ${hy + 2} q -10 8 -4 18" stroke="${r.col}" stroke-width="1.4" fill="none" opacity=".8"/>`;
      g += `<rect x="${hx - 12}" y="${hy + 18}" width="9" height="7" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".85"/>`;
      // bridgemaster at the quadrant for live sessions
      if (r.live) {
        g += `<g class="bs-master" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${hx - 22} ${pierY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="0" x2="10" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // jammed trunnion — cross mark on errors
      if (r.err) g += `<path d="M ${hx - 3} ${hy - 3} l 6 6 M ${hx + 3} ${hy - 3} l -6 6" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${pierY + 18}" text-anchor="middle" class="bs-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bs-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "开启桥", eyebrow: "PROVIDER BASCULE", render };
})();
