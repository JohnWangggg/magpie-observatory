/* -------------------------------------------------------------------- fuller
 * Fuller view — a row of fulling troughs, one per provider.
 * Finished cloth on the tenter = tokens; a fuller treading
 * for live sessions; a split trough marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fuller";
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
    if (!rows.length) { host.innerHTML = `<div class="fu-empty">暂无漂洗坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // fulling-yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const cloth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8898b8" : "#688098";
      const vatW = seg * .4;
      const vatY = floorY - 22;
      const vatH = 16;
      // the fulling trough — a low tub with liquor
      g += `<path d="M ${x - vatW / 2} ${vatY} h ${vatW} l -4 ${vatH} h ${-vatW + 8} z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // liquor surface
      g += `<ellipse cx="${x}" cy="${vatY + 3}" rx="${vatW * .4}" ry="2.5" fill="${cloth}" opacity=".5"/>`;
      // the cloth being trodden — a fold in the liquor
      g += `<path d="M ${x - 8} ${vatY + 2} q 4 -3 8 0 q 4 3 8 0" fill="none" stroke="${cloth}" stroke-width="1.2"/>`;
      // the tenter — a frame with hooks beside the trough
      const tentW = seg * .22;
      g += `<rect x="${x + vatW * .5}" y="${vatY - 4}" width="${tentW}" height="16" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x + vatW * .5 + 3 + t * (tentW - 6) / 2}" y1="${vatY - 4}" x2="${x + vatW * .5 + 3 + t * (tentW - 6) / 2}" y2="${vatY - 1}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // cloth on the tenter — stretched pieces by tokens
      const pieces = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pieces; p++) {
        g += `<rect x="${x + vatW * .52 + p * 4}" y="${vatY - 1}" width="${tentW * .7}" height="8" fill="${p === 0 && r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // fuller's earth — a sack beside the trough
      g += `<path d="M ${x - vatW * .5 - 10} ${floorY - 8} q 5 -4 10 0 l -1 6 h -8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // fuller treading for live sessions — figure with legs in the trough
      if (r.live) {
        g += `<g class="fu-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - 4} ${vatY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-1" y1="11" x2="-1" y2="18" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="3" y1="11" x2="4" y2="18" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split trough — a crack in the wall on errors
      if (r.err) g += `<path d="M ${x - vatW * .3} ${vatY + 2} l 5 10" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="fu-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "漂洗坊", eyebrow: "PROVIDER FULLER", render };
})();
