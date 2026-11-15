/* ------------------------------------------------------------------- odeon
 * Odeon view — a semicircular cavea (tiered seating), one provider
 * per tier. Seat fill = tokens; a lit torch on the aisle marks live
 * sessions; a broken seat marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "odeon";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H * 0.92;
    const maxR = Math.min(W, H) * .52;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="od-empty">暂无看台</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // orchestra floor
    g += `<circle cx="${cx}" cy="${cy}" r="${(maxR * .35).toFixed(0)}" fill="var(--card-2)"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${(maxR * .35).toFixed(0)}" fill="none" stroke="var(--line)" stroke-width="1.4"/>`;
    // stage at centre — altar
    g += `<rect x="${cx - 10}" y="${cy - 14}" width="20" height="14" fill="var(--card-3)" stroke="var(--line)" stroke-width="1"/>`;

    rows.forEach((r, i) => {
      const r0 = maxR * .35 + i * ((maxR * .6) / rows.length);
      const r1 = r0 + (maxR * .6) / rows.length - 4;
      const seats = 8 + Math.floor(r.tok / maxTok * 8);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // tier arc
      const a0 = Math.PI, a1 = Math.PI * 2;
      g += `<path d="M ${cx + Math.cos(a0) * r0} ${cy + Math.sin(a0) * r0 * .6} A ${r0} ${r0 * .6} 0 0 1 ${cx + Math.cos(a1) * r0} ${cy + Math.sin(a1) * r0 * .6}" fill="none" stroke="${r.col}" stroke-width="${(r1 - r0).toFixed(0)}" opacity=".5"/>`;
      // seats — small blocks on the arc
      for (let s = 0; s < seats; s++) {
        const a = Math.PI + (s / (seats - 1)) * Math.PI;
        const sx = cx + Math.cos(a) * ((r0 + r1) / 2), sy = cy + Math.sin(a) * ((r0 + r1) / 2) * .6;
        g += `<rect x="${(sx - 2).toFixed(0)}" y="${(sy - 3).toFixed(0)}" width="4" height="3" fill="${tint}" opacity=".8"/>`;
      }
      // aisle torch for live sessions
      if (r.live) {
        const tx = cx + (r0 + r1) / 2, ty = cy - (r0 + r1) * .6 / 2;
        g += `<g class="od-torch" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${tx.toFixed(0)}" y1="${ty.toFixed(0)}" x2="${tx.toFixed(0)}" y2="${ty - 10}" stroke="${r.col}" stroke-width="1.4"/>
          <circle cx="${tx.toFixed(0)}" cy="${(ty - 13).toFixed(0)}" r="2.5" fill="${tint}"/>
        </g>`;
      }
      g += `<text x="${cx - (r0 + r1) / 2 - 6}" y="${cy - (r0 + r1) * .6 / 2}" text-anchor="end" class="od-lab">${esc(r.name.split("/").pop().slice(0, 7))} ${(r.tok / 1000).toFixed(0)}k${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="od-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "乐厅", eyebrow: "PROVIDER ODEON", render };
})();
