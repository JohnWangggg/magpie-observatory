/* ----------------------------------------------------------------- fullery
 * Fullery view — a row of fulling stocks, one per provider. Cloth
 * length on the beam = tokens; a raised helve hammer for live
 * sessions; a cracked stock marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fullery";
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
    if (!rows.length) { host.innerHTML = `<div class="fu-empty">暂无锤组</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const stockW = seg * .7;
      const stockH = 34;
      const stockY = floorY - stockH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8a888" : "#908060";
      // stock frame — trough with posts
      g += `<rect x="${x - stockW / 2}" y="${stockY}" width="8" height="${stockH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + stockW / 2 - 8}" y="${stockY}" width="8" height="${stockH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - stockW / 2}" y="${stockY + stockH - 8}" width="${stockW}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // cloth roll on beam — length by tokens
      const clothW = stockW * .4 + (r.tok / maxTok) * stockW * .3;
      g += `<rect x="${(x - clothW / 2).toFixed(0)}" y="${stockY + 4}" width="${clothW.toFixed(0)}" height="${stockH - 16}" rx="3" fill="${tint}" opacity=".6" ${r.err ? 'stroke="var(--red)" stroke-width="1" stroke-dasharray="3 2"' : `stroke="${r.col}" stroke-width="1"`}/>`;
      // beam across top
      g += `<rect x="${x - stockW / 2}" y="${stockY - 4}" width="${stockW}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // helve hammer — pivoted, raised for live
      const helveY = stockY - 12;
      const lift = r.live ? -10 : 0;
      g += `<g class="fu-helve" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + stockW / 2 - 4} ${helveY}) rotate(${-15 + lift} ${x + stockW / 2} ${stockY})">
        <rect x="0" y="0" width="${stockW * .5}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        <rect x="${stockW * .5 - 6}" y="-4" width="8" height="8" fill="${r.col}" opacity=".7"/>
      </g>`;
      // water wheel behind for live
      if (r.live) {
        g += `<g class="fu-wheel" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + stockW / 2 + 20} ${stockY + 10})">
          <circle r="10" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <path d="M 0 0 l -8 -8 M 0 0 l 8 8 M 0 0 l -8 8 M 0 0 l 8 -8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked stock on errors
      if (r.err) g += `<path d="M ${x - stockW * .3} ${stockY + 6} L ${x - stockW * .2} ${stockY + 18} L ${x - stockW * .28} ${stockY + 30}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="fu-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缩绒坊", eyebrow: "PROVIDER FULLERY", render };
})();
