/* ------------------------------------------------------------------ slipway
 * Slipway view — a row of building berths on a launching way,
 * one per provider. Hull frames raised on the keel = tokens; a
 * shipwright wedging a shore for live sessions; a hogged keel
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "slipway";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sw-empty">暂无滑道船台</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water at the foot of the ways
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="#1e3348" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wayW = seg * .7;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const keelY = waterY - 30;
      // the sloping way — groundway timbers
      g += `<line x1="${x - wayW / 2}" y1="${waterY - 8}" x2="${x + wayW / 2}" y2="${waterY - 2}" stroke="var(--line)" stroke-width="2" opacity=".6"/>`;
      for (let t = 0; t < 4; t++) {
        const tx = x - wayW / 2 + wayW * t / 3;
        g += `<line x1="${tx.toFixed(0)}" y1="${(waterY - 8 + t * 2).toFixed(0)}" x2="${tx.toFixed(0)}" y2="${(waterY - 4 + t * 2).toFixed(0)}" stroke="var(--line)" stroke-width="1.2" opacity=".5"/>`;
      }
      // keel blocks
      g += `<rect x="${x - wayW * .3}" y="${keelY + 12}" width="8" height="8" fill="var(--card-3)" stroke="var(--line)" stroke-width=".8"/>`;
      g += `<rect x="${x + wayW * .3 - 8}" y="${keelY + 12}" width="8" height="8" fill="var(--card-3)" stroke="var(--line)" stroke-width=".8"/>`;
      // keel line
      g += `<line x1="${x - wayW * .38}" y1="${keelY + 12}" x2="${x + wayW * .38}" y2="${keelY + 12}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2.5" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // hull frames rising from the keel — count by tokens
      const ribs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      const ribSpan = wayW * .6 / Math.max(1, ribs + 1);
      for (let b = 0; b < ribs; b++) {
        const rx = x - wayW * .3 + ribSpan * (b + 1);
        g += `<path d="M ${rx.toFixed(0)} ${keelY + 12} q 0 -20 ${ribSpan * .4} -26 M ${rx.toFixed(0)} ${keelY + 12} q 0 -20 ${-ribSpan * .4} -26" stroke="${tint}" stroke-width="1.6" fill="none" opacity=".85"/>`;
      }
      // ribbands joining the frames
      g += `<line x1="${x - wayW * .3}" y1="${keelY - 6}" x2="${x + wayW * .3}" y2="${keelY - 6}" stroke="${r.col}" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>`;
      // shores propping the hull
      g += `<line x1="${x - wayW * .42}" y1="${waterY - 6}" x2="${x - wayW * .34}" y2="${keelY + 4}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + wayW * .42}" y1="${waterY - 6}" x2="${x + wayW * .34}" y2="${keelY + 4}" stroke="${r.col}" stroke-width="1.6"/>`;
      // shipwright wedging a shore for live sessions
      if (r.live) {
        g += `<g class="sw-wright" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - wayW * .46} ${waterY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="10" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // hogged keel — a sagging bow on errors
      if (r.err) g += `<path d="M ${x - wayW * .36} ${keelY + 10} q 8 6 16 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${waterY + 14}" text-anchor="middle" class="sw-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "滑道船台", eyebrow: "PROVIDER SLIPWAY", render };
})();
