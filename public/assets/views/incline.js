/* ----------------------------------------------------------------- incline
 * Incline view — a hillside of self-acting inclines, one per
 * provider. Loaded tubs descending = tokens; a full wagon at the
 * brow for live sessions; a derailed tub marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "incline";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const browY = H * .3, footY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="in-empty">暂无斜道</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // hillside
    g += `<path d="M 0 ${browY} L ${W} ${footY} L ${W} ${H} L 0 ${H} Z" fill="var(--card-2)" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const trackW = seg * .7;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#a08858";
      // track — inclined rails
      const railY1 = browY + 10, railY2 = footY - 10;
      g += `<line x1="${x - trackW * .3}" y1="${railY1}" x2="${x - trackW * .3}" y2="${railY2}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + trackW * .3}" y1="${railY1}" x2="${x + trackW * .3}" y2="${railY2}" stroke="${r.col}" stroke-width="1.6"/>`;
      // sleepers
      for (let s = 0; s < 7; s++) {
        const sy = railY1 + (s / 6) * (railY2 - railY1);
        g += `<line x1="${x - trackW * .35}" y1="${sy.toFixed(0)}" x2="${x + trackW * .35}" y2="${sy.toFixed(0)}" stroke="${r.col}" stroke-width=".8" opacity=".5"/>`;
      }
      // tubs descending — count by tokens
      const tubs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < tubs; t++) {
        const tt = t / (tubs - 1 || 1);
        const tx = x - trackW * .3 + (x + trackW * .3 - (x - trackW * .3)) * tt;
        const ty = railY1 + (railY2 - railY1) * tt;
        g += `<g class="in-tub" style="animation-delay: ${(i * .3 + t * .2).toFixed(1)}s" transform="translate(${tx.toFixed(0)} ${ty.toFixed(0)}) rotate(18)">
          <rect x="-7" y="-5" width="14" height="10" rx="1.5" fill="${tint}" stroke="${r.col}" stroke-width="1"/>
          <circle cx="-4" cy="6" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>
          <circle cx="4" cy="6" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // full wagon at brow for live sessions
      if (r.live) {
        g += `<g class="in-wagon" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - trackW * .3 - 10}" y="${browY - 14}" width="20" height="12" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="${x - trackW * .3 - 4}" cy="${browY - 2}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="${x - trackW * .3 + 4}" cy="${browY - 2}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // derailed tub on errors
      if (r.err) g += `<rect x="${x + trackW * .3 + 4}" y="${railY2 - 8}" width="12" height="8" rx="1.5" fill="var(--red)" opacity=".5" transform="rotate(25 ${x + trackW * .3 + 10} ${railY2 - 4})"/>`;
      g += `<text x="${x}" y="${footY + 18}" text-anchor="middle" class="in-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="in-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "斜道", eyebrow: "PROVIDER INCLINE", render };
})();
