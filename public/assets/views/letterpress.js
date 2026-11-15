/* ------------------------------------------------------------ letterpress
 * Letterpress view — a row of platen presses, one per provider.
 * Sheets on the delivery pile = tokens; a pressman feeding paper
 * for live sessions; a jammed platen marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "letterpress";
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
    if (!rows.length) { host.innerHTML = `<div class="lt-empty">暂无印坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pressW = seg * .6;
      const pressH = 40;
      const pressY = floorY - pressH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c0c8d8" : "#8890a8";
      // press body — platen press silhouette
      g += `<rect x="${x - pressW / 2}" y="${pressY}" width="${pressW}" height="${pressH}" rx="3" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // platen + bed
      g += `<rect x="${x - pressW * .3}" y="${pressY + 8}" width="${pressW * .6}" height="6" fill="var(--bg)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - pressW * .3}" y="${pressY + 16}" width="${pressW * .6}" height="4" fill="${tint}" opacity=".6" ${r.err ? 'stroke="var(--red)" stroke-width="1" stroke-dasharray="2 2"' : `stroke="${r.col}" stroke-width=".8"`}/>`;
      // flywheel
      g += `<circle cx="${x + pressW / 2 - 6}" cy="${pressY + 12}" r="7" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + pressW / 2 - 13}" y1="${pressY + 12}" x2="${x + pressW / 2 + 1}" y2="${pressY + 12}" stroke="${r.col}" stroke-width="1"/>`;
      // delivery pile — stacked sheets by tokens
      const sheets = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let s = 0; s < sheets; s++) {
        g += `<rect x="${x - pressW * .3}" y="${(pressY + pressH - 6 - s * 3).toFixed(0)}" width="${pressW * .6}" height="2.5" fill="${tint}" opacity=".8"/>`;
      }
      // pressman feeding paper for live sessions
      if (r.live) {
        g += `<g class="lt-feed" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pressW / 2 - 14} ${floorY - 10})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // jammed platen on errors
      if (r.err) g += `<path d="M ${x - pressW * .3} ${pressY + 10} l 6 4 l -6 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lt-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "活版印坊", eyebrow: "PROVIDER LETTERPRESS", render };
})();
