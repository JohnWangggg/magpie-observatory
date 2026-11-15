/* ------------------------------------------------------------------ hollander
 * Hollander view — a row of beating vats, one per provider.
 * Sheets laid on the post = tokens; a beater ladling pulp
 * for live sessions; a torn mould marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hollander";
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
    if (!rows.length) { host.innerHTML = `<div class="ho-empty">暂无打浆坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // paper-loft floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pulp = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c090" : "#a89870";
      const vatW = seg * .44;
      const vatY = floorY - 26;
      const vatH = 20;
      // the beating vat — a tub with a mid-floor partition
      g += `<rect x="${x - vatW / 2}" y="${vatY}" width="${vatW}" height="${vatH}" rx="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x}" y1="${vatY + 2}" x2="${x}" y2="${vatY + vatH - 2}" stroke="${r.col}" stroke-width="1"/>`;
      // pulp surface — a soft band inside
      g += `<ellipse cx="${x}" cy="${vatY + 6}" rx="${vatW * .4}" ry="3" fill="${pulp}" opacity=".5"/>`;
      // the beating roll — a spoked drum over the vat
      g += `<circle cx="${x - vatW * .22}" cy="${vatY + 8}" r="7" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      for (let b = 0; b < 4; b++) {
        const a = b * Math.PI / 2;
        g += `<line x1="${x - vatW * .22}" y1="${vatY + 8}" x2="${x - vatW * .22 + Math.cos(a) * 7}" y2="${vatY + 8 + Math.sin(a) * 7}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // backfall — the pulp returning over the partition
      g += `<path d="M ${x - vatW * .22} ${vatY + 1} q ${vatW * .22} -6 ${vatW * .44} 2" fill="none" stroke="${pulp}" stroke-width="1"/>`;
      // the mould — a deckle frame leaning beside
      g += `<rect x="${x + vatW * .28}" y="${vatY + 4}" width="14" height="10" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1"/>`;
      // sheets on the post — a stack beside the vat, count by tokens
      const sheets = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < sheets; s++) {
        g += `<rect x="${x + vatW * .52}" y="${floorY - 4 - s * 3}" width="12" height="2" fill="${s === 0 && r.err ? "var(--red)" : "#e8e4d8"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // beater ladling for live sessions — figure with a dipper
      if (r.live) {
        g += `<g class="ho-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - vatW * .05} ${vatY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="12" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="15" cy="13" r="2" fill="${pulp}"/>
        </g>`;
      }
      // torn mould — a rip across the frame on errors
      if (r.err) g += `<path d="M ${x + vatW * .28} ${vatY + 4} l 14 10" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ho-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ho-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "打浆坊", eyebrow: "PROVIDER HOLLANDER", render };
})();
