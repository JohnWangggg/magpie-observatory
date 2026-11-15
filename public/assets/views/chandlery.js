/* -------------------------------------------------------------- chandlery
 * Chandlery view — a row of dipping frames, one per provider.
 * Tapers hanging from the frame = tokens; a chandler working the
 * vat for live sessions; a guttered candle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "chandlery";
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
    if (!rows.length) { host.innerHTML = `<div class="ch-empty">暂无蜡烛坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const frameW = seg * .6;
      const frameY = floorY - 52;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0d888" : "#d0b060";
      // dipping frame — two posts + crossbar
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="5" height="${floorY - frameY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + frameW / 2 - 5}" y="${frameY}" width="5" height="${floorY - frameY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="${frameW}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // hanging tapers — count by tokens
      const tapers = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let t = 0; t < tapers; t++) {
        const tx = x - frameW * .35 + t * (frameW * .7 / (tapers - 1 || 1));
        const len = 14 + (t % 3) * 4;
        g += `<line x1="${tx.toFixed(0)}" y1="${frameY + 4}" x2="${tx.toFixed(0)}" y2="${frameY + 8}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<rect x="${(tx - 2).toFixed(0)}" y="${frameY + 8}" width="4" height="${len}" rx="1.5" fill="${tint}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width=".8" ${r.err && t === 0 ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      // wax vat below
      g += `<ellipse cx="${x}" cy="${floorY - 4}" rx="${frameW * .3}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // chandler dipping for live sessions
      if (r.live) {
        g += `<g class="ch-dipper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + frameW / 2 + 12} ${floorY - 10})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // guttered candle on errors — dripped wax blob
      if (r.err) g += `<path d="M ${x - frameW * .2} ${floorY - 4} q 3 4 6 0 q -3 -2 -6 0" fill="var(--red)" opacity=".5"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ch-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蜡烛坊", eyebrow: "PROVIDER CHANDLERY", render };
})();
