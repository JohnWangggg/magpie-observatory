/* ------------------------------------------------------------------- pinmill
 * Pinmill view — a row of pointing wheels, one per provider.
 * Finished pins on the stick = tokens; a pinner filing a
 * point for live sessions; a snapped pin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pinmill";
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
    if (!rows.length) { host.innerHTML = `<div class="pn-empty">暂无制针坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8d0d8" : "#98a0a8";
      const wheelR = seg * .18;
      const cy = floorY - 24;
      // pointing wheel — a treadle grindstone on a frame
      g += `<line x1="${x - seg * .28}" y1="${floorY}" x2="${x - seg * .2}" y2="${cy}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + seg * .28}" y1="${floorY}" x2="${x + seg * .2}" y2="${cy}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x}" cy="${cy}" r="${wheelR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<circle cx="${x}" cy="${cy}" r="2.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // pin resting on the wheel — being pointed
      g += `<line x1="${x - wheelR}" y1="${cy - wheelR + 2}" x2="${x + wheelR * .8}" y2="${cy - wheelR - 2}" stroke="${steel}" stroke-width="1.4"/>`;
      // pin stick — a row of finished pins on a card, count by tokens
      const pins = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      g += `<rect x="${x + seg * .32}" y="${floorY - 20}" width="${seg * .16}" height="14" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      for (let p = 0; p < pins; p++) {
        const px = x + seg * .34 + p * (seg * .035);
        g += `<line x1="${px}" y1="${floorY - 18}" x2="${px}" y2="${floorY - 8}" stroke="${p === 0 && r.err ? "var(--red)" : steel}" stroke-width="1"/>`;
        g += `<circle cx="${px}" cy="${floorY - 18.5}" r=".8" fill="${r.col}"/>`;
      }
      // pinner filing for live sessions
      if (r.live) {
        g += `<g class="pn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="0" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // snapped pin — a broken point on errors
      if (r.err) g += `<line x1="${x + seg * .34}" y1="${floorY - 18}" x2="${x + seg * .34 + 4}" y2="${floorY - 24}" stroke="var(--red)" stroke-width="1.2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "制针坊", eyebrow: "PROVIDER PINMILL", render };
})();
