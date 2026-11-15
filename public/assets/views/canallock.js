/* --------------------------------------------------------------- canallock
 * Canallock view — a row of pound-lock chambers, one per provider.
 * Water depth in the chamber = tokens; a keeper winding the
 * paddles for live sessions; a burst mitre gate marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "canallock";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cl-empty">暂无船闸</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // canal banks
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const chamberW = seg * .6;
      const chamberH = 32;
      const chamberTop = bankY - chamberH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a88b8" : "#3a6088";
      // chamber walls — two solid piers
      g += `<rect x="${x - chamberW / 2}" y="${chamberTop}" width="10" height="${chamberH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x + chamberW / 2 - 10}" y="${chamberTop}" width="10" height="${chamberH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // chamber floor
      g += `<rect x="${x - chamberW / 2 + 10}" y="${chamberTop + chamberH - 5}" width="${chamberW - 20}" height="5" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // water in the chamber — depth by tokens
      const waterH = 4 + (r.tok / maxTok) * (chamberH - 12);
      g += `<rect x="${x - chamberW / 2 + 10}" y="${(chamberTop + chamberH - 5 - waterH).toFixed(1)}" width="${chamberW - 20}" height="${waterH.toFixed(1)}" fill="${tint}" opacity=".55"/>`;
      // mitre gates at both ends — angled leaves
      g += `<line x1="${x - chamberW / 2 + 10}" y1="${chamberTop}" x2="${x - chamberW / 2 + 16}" y2="${chamberTop + 10}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<line x1="${x + chamberW / 2 - 10}" y1="${chamberTop}" x2="${x + chamberW / 2 - 16}" y2="${chamberTop + 10}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // balance beam above the far gate
      g += `<line x1="${x + chamberW / 2 - 4}" y1="${chamberTop - 4}" x2="${x + chamberW / 2 + 10}" y2="${chamberTop - 10}" stroke="${r.col}" stroke-width="1.4"/>`;
      // paddle windlass on the near pier
      g += `<circle cx="${x - chamberW / 2 + 5}" cy="${chamberTop + 6}" r="3" fill="none" stroke="${r.col}" stroke-width="1" opacity=".8"/>`;
      // keeper on the near pier for live sessions
      if (r.live) {
        g += `<g class="cl-keeper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - chamberW / 2 + 5} ${chamberTop - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="0" x2="8" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst gate — leak spurting under the far mitre
      if (r.err) g += `<path d="M ${x + chamberW / 2 - 14} ${chamberTop + 12} q 4 6 2 12" stroke="var(--red)" stroke-width="1.6" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${bankY + 18}" text-anchor="middle" class="cl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "船闸", eyebrow: "PROVIDER CANALLOCK", render };
})();
