/* ------------------------------------------------------------------- dyevat
 * Dyevat view — a row of dye vats, one per provider. Depth of
 * liquor inside = tokens; a dipper hoisting a cloth hank for
 * live sessions; a burst seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dyevat";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="dv-empty">暂无染缸</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // dyehouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const vatW = seg * .6;
      const vatH = 34;
      const vatTop = floorY - vatH - 6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a78c8" : "#3a5088";
      // vat — thick-walled cylinder in section
      g += `<rect x="${x - vatW / 2}" y="${vatTop}" width="${vatW}" height="${vatH}" rx="3" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.8" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // liquor inside — depth by tokens, provider-coloured
      const liqH = 5 + (r.tok / maxTok) * (vatH - 12);
      g += `<rect x="${x - vatW / 2 + 3}" y="${(vatTop + vatH - 4 - liqH).toFixed(0)}" width="${vatW - 6}" height="${liqH.toFixed(0)}" fill="${tint}" opacity=".55"/>`;
      // surface film of dye
      g += `<ellipse cx="${x}" cy="${(vatTop + vatH - 4 - liqH).toFixed(0)}" rx="${(vatW / 2 - 4).toFixed(0)}" ry="2.5" fill="${r.col}" opacity=".6"/>`;
      // hank of cloth hanging over a winch bar above
      const barY = vatTop - 8;
      g += `<line x1="${x - vatW * .4}" y1="${barY}" x2="${x + vatW * .4}" y2="${barY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // cloth hank — length by tokens
      const hankLen = 6 + (r.tok / maxTok) * 16;
      g += `<path d="M ${x - 3} ${barY} q 0 ${hankLen} 6 ${hankLen} q 6 0 6 ${-hankLen * .6}" stroke="${tint}" stroke-width="4" fill="none" opacity=".8"/>`;
      // dipper holding the hank for live sessions
      if (r.live) {
        g += `<g class="dv-dipper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + vatW / 2 + 10} ${vatTop + 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-14" y2="-2" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst seam — dye leaking at the wall on errors
      if (r.err) g += `<path d="M ${x + vatW / 2 - 2} ${vatTop + 12} l 4 6 l -2 8" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="dv-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "染缸", eyebrow: "PROVIDER DYEVAT", render };
})();
