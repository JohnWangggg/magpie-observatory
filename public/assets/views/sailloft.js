/* --------------------------------------------------------------- sailloft
 * Sailloft view — a row of sail lofts, one per provider. Cloth
 * panels on the sail = tokens; a sailmaker sewing for live
 * sessions; a torn seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sailloft";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sl-empty">暂无帆篷</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // loft floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    // roof beams
    for (let x = 20; x < W; x += 60) g += `<rect x="${x}" y="8" width="4" height="${floorY - 8}" fill="var(--card-2)" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const sailW = seg * .7;
      const sailH = 44;
      const sailY = floorY - sailH - 8;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0d8c8" : "#b8b0a0";
      // sail — trapezoid, panels by tokens
      const panels = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      const panelW = sailW / panels;
      for (let p = 0; p < panels; p++) {
        const px = x - sailW / 2 + p * panelW;
        const taper = 1 - (p / panels) * .3;
        g += `<rect x="${px.toFixed(0)}" y="${(sailY + p * 2).toFixed(0)}" width="${panelW.toFixed(0)}" height="${(sailH * taper).toFixed(0)}" fill="${tint}" opacity=".5" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err && p === panels - 1 ? 'stroke-dasharray="3 2"' : ""}/>`;
      }
      // boltrope edge
      g += `<path d="M ${x - sailW / 2} ${sailY} L ${x + sailW / 2} ${sailY}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<path d="M ${x - sailW / 2} ${sailY} L ${x - sailW / 2} ${sailY + sailH}" stroke="${r.col}" stroke-width="1.6"/>`;
      // seams
      for (let s = 1; s < panels; s++) {
        const sx = x - sailW / 2 + s * panelW;
        g += `<line x1="${sx.toFixed(0)}" y1="${sailY + 2}" x2="${sx.toFixed(0)}" y2="${sailY + sailH - 4}" stroke="${r.col}" stroke-width=".6" stroke-dasharray="4 2" opacity=".5"/>`;
      }
      // sailmaker — seated figure sewing for live sessions
      if (r.live) {
        g += `<g class="sl-maker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + sailW / 2 + 14} ${floorY - 6})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-5" y="4" width="10" height="6" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="0" y1="4" x2="0" y2="12" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // torn seam on errors
      if (r.err) g += `<path d="M ${x + sailW * .2} ${sailY + 10} l -4 4 l 4 4 l -4 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "帆篷", eyebrow: "PROVIDER SAILLOFT", render };
})();
