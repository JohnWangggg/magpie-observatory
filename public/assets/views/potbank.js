/* ----------------------------------------------------------------- potbank
 * Potbank view — a row of bottle ovens, one per provider. Saggars
 * stacked at the wicket = tokens; a placer carrying ware for live
 * sessions; a bulged oven wall marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "potbank";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pb-empty">暂无陶窑厂</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cobbled yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ovenW = seg * .55;
      const ovenH = 50;
      const ovenY = yardY - ovenH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d08858" : "#a06840";
      // bottle oven — hovel cone with narrow neck
      g += `<path d="M ${x - ovenW / 2} ${yardY} L ${x - ovenW * .28} ${ovenY + 10} L ${x - ovenW * .14} ${ovenY} L ${x + ovenW * .14} ${ovenY} L ${x + ovenW * .28} ${ovenY + 10} L ${x + ovenW / 2} ${yardY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // wicket — arched doorway
      g += `<path d="M ${x - 8} ${yardY} L ${x - 8} ${yardY - 14} Q ${x} ${yardY - 20} ${x + 8} ${yardY - 14} L ${x + 8} ${yardY} Z" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      // saggars stacked at wicket — count by tokens
      const saggars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < saggars; s++) {
        g += `<ellipse cx="${x}" cy="${(yardY - 6 - s * 6).toFixed(0)}" rx="6" ry="3" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".85"/>`;
      }
      // smoke wisp from neck for live
      if (r.live) {
        g += `<path class="pb-smoke" style="animation-delay: ${(i * .3).toFixed(1)}s" d="M ${x} ${ovenY - 4} q 4 -6 0 -12 q -4 -6 0 -12" stroke="${r.col}" stroke-width="1.4" fill="none" opacity=".6"/>`;
        // placer carrying a saggar
        g += `<g class="pb-placer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + ovenW / 2 + 12} ${yardY - 8})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <ellipse cx="0" cy="-6" rx="5" ry="2.5" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // bulged wall on errors
      if (r.err) g += `<path d="M ${x + ovenW * .28} ${yardY - 20} q 8 4 0 12" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="pb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "陶窑厂", eyebrow: "PROVIDER POTBANK", render };
})();
