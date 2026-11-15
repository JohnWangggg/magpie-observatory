/* --------------------------------------------------------------------- noria
 * Noria view — a row of chain-and-bucket wheels, one per provider.
 * Pots rising on the chain = tokens; a driver tending the
 * wheel for live sessions; a snarled chain marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "noria";
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
    if (!rows.length) { host.innerHTML = `<div class="nr-empty">暂无链水车</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // river terrace floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    // river water at the base
    g += `<rect x="0" y="${floorY - 8}" width="${W}" height="8" fill="var(--card-3)" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const clay = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c08850" : "#987040";
      const wr = seg * .18;
      const wy = floorY - 38;
      // the frame — two posts and a bearing
      g += `<line x1="${x - wr - 6}" y1="${floorY - 8}" x2="${x - wr - 6}" y2="${wy + wr * .5}" stroke="${r.col}" stroke-width="1.5"/>`;
      g += `<line x1="${x + wr + 6}" y1="${floorY - 8}" x2="${x + wr + 6}" y2="${wy + wr * .5}" stroke="${r.col}" stroke-width="1.5"/>`;
      g += `<line x1="${x - wr - 6}" y1="${wy + wr * .5}" x2="${x + wr + 6}" y2="${wy + wr * .5}" stroke="${r.col}" stroke-width="1"/>`;
      // the wheel — rim, spokes, hub
      g += `<circle cx="${x}" cy="${wy}" r="${wr}" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x}" cy="${wy}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g += `<line x1="${x}" y1="${wy}" x2="${x + Math.cos(a) * wr}" y2="${wy + Math.sin(a) * wr}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // the chain — a loop over the wheel down to the water
      g += `<path d="M ${x - wr * .5} ${wy} a ${wr * .5} ${wr * .5} 0 0 1 ${wr} 0" fill="none" stroke="${clay}" stroke-width="1.2"/>`;
      g += `<line x1="${x - wr * .5}" y1="${wy}" x2="${x - wr * .5}" y2="${floorY - 6}" stroke="${clay}" stroke-width="1"/>`;
      g += `<line x1="${x + wr * .5}" y1="${wy}" x2="${x + wr * .5}" y2="${floorY - 6}" stroke="${clay}" stroke-width="1"/>`;
      // pots on the chain — count by tokens
      const pots = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pots; p++) {
        const py = wy + 6 + p * ((floorY - 8 - wy - 6) / 4);
        g += `<rect x="${x - wr * .5 - 2.5}" y="${py}" width="5" height="4" rx="1" fill="${p === 0 && r.err ? "var(--red)" : clay}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // driver tending for live sessions — figure at the bearing
      if (r.live) {
        g += `<g class="nr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + wr + 10} ${wy + wr * .5 - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="7" x2="-14" y2="4" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // snarled chain — a kinked loop on errors
      if (r.err) g += `<path d="M ${x - wr * .5} ${floorY - 12} q 4 -4 8 0 q -4 3 -8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="nr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="nr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "链水车", eyebrow: "PROVIDER NORIA", render };
})();
