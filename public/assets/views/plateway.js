/* ------------------------------------------------------------------ plateway
 * Plateway view — a row of L-flanged iron trackways, one per
 * provider. Wagon count standing on the plates = tokens; a
 * platelayer at the sleeper for live sessions; a broken plate
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "plateway";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bedY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pw-empty">暂无盘道</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stone bed
    g += `<rect y="${bedY}" width="${W}" height="${H - bedY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const trackW = seg * .66;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      // two parallel L-plates on sleepers
      const railY = bedY - 10;
      for (const ry of [railY, railY + 8]) {
        g += `<line x1="${x - trackW / 2}" y1="${ry}" x2="${x + trackW / 2}" y2="${ry}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.8" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
        g += `<line x1="${x - trackW / 2}" y1="${ry - 2}" x2="${x - trackW / 2}" y2="${ry}" stroke="${r.col}" stroke-width="1" opacity=".7"/>`;
      }
      // sleepers
      for (let sx = x - trackW / 2; sx < x + trackW / 2; sx += 12) {
        g += `<line x1="${sx}" y1="${railY + 10}" x2="${sx}" y2="${railY + 13}" stroke="var(--line)" stroke-width="1.4" opacity=".6"/>`;
      }
      // waggons — count by tokens
      const waggons = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      const wagW = (trackW - 16) / Math.max(1, waggons) * .7;
      for (let w = 0; w < waggons; w++) {
        const wx = x - trackW / 2 + 8 + (trackW - 16) * (w + .5) / waggons;
        g += `<rect x="${(wx - wagW / 2).toFixed(0)}" y="${railY - 10}" width="${wagW.toFixed(0)}" height="8" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<circle cx="${(wx - wagW / 4).toFixed(0)}" cy="${railY - 1}" r="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<circle cx="${(wx + wagW / 4).toFixed(0)}" cy="${railY - 1}" r="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // platelayer kneeling at a sleeper for live sessions
      if (r.live) {
        g += `<g class="pw-layer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + trackW / 2 + 10} ${railY - 2})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // broken plate — a snapped rail end on errors
      if (r.err) g += `<path d="M ${x + trackW * .3} ${railY - 3} l 4 -6 l -4 -2" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${bedY + 18}" text-anchor="middle" class="pw-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "盘道", eyebrow: "PROVIDER PLATEWAY", render };
})();
