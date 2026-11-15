/* ------------------------------------------------------------------ palmento
 * Palmento view — a row of treading floors, one per provider.
 * The cap rising on the must = tokens; a treader plunging for
 * live sessions; a vinegar streak marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "palmento";
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
    if (!rows.length) { host.innerHTML = `<div class="pm-empty">暂无踩酒庄</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // palmento floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const must = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#783048" : "#582038";
      const vatW = seg * .5;
      const vatH = 36;
      const vatY = floorY - 4;
      // the treading vat — a shallow stone basin
      g += `<path d="M ${x - vatW / 2} ${vatY - vatH} L ${x - vatW * .4} ${vatY} L ${x + vatW * .4} ${vatY} L ${x + vatW * .5} ${vatY - vatH} Z"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // must in the vat — depth by tokens
      const mustH = vatH * .5 + (r.tok / maxTok) * vatH * .25;
      g += `<path d="M ${x - vatW * .44} ${(vatY - mustH).toFixed(0)} L ${x - vatW * .4} ${vatY} L ${x + vatW * .4} ${vatY} L ${x + vatW * .44} ${(vatY - mustH).toFixed(0)} Z"
            fill="${must}" opacity=".85"/>`;
      // cap of skins floating on the must
      g += `<ellipse cx="${x}" cy="${(vatY - mustH).toFixed(0)}" rx="${vatW * .4}" ry="3.5" fill="${r.err ? "var(--red)" : "#986858"}" opacity=".9"/>`;
      // berries on the cap — dots
      for (let b = 0; b < 4; b++) {
        g += `<circle cx="${x - vatW * .25 + b * (vatW * .15)}" cy="${vatY - mustH - 2}" r="1.2" fill="${r.err ? "var(--red)" : "#c08878"}" opacity=".8"/>`;
      }
      // treader plunging for live sessions — a foot on the cap
      if (r.live) {
        g += `<g class="pm-treader" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - vatW * .2} ${vatY - mustH - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="1" y1="12" x2="6" y2="18" stroke="${r.col}" stroke-width="1.6"/>
        </g>`;
      }
      // vinegar streak — a sour patch on errors
      if (r.err) g += `<path d="M ${x + vatW * .1} ${vatY - mustH - 4} l 6 3 l -5 3" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "踩酒庄", eyebrow: "PROVIDER PALMENTO", render };
})();
