/* ------------------------------------------------------------------ lagar
 * Lagar view — a row of stone treading tanks, one per provider.
 * Must depth in the tank = tokens; a treader knee-deep for live
 * sessions; a cracked spout marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lagar";
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
    if (!rows.length) { host.innerHTML = `<div class="lg-empty">暂无踏酒槽</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cellar floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tankW = seg * .66;
      const tankH = 34;
      const tankY = floorY - tankH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b05878" : "#7a3850";
      // stone tank — thick-walled rectangle
      g += `<rect x="${x - tankW / 2}" y="${tankY}" width="${tankW}" height="${tankH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // must inside — depth by tokens
      const mustH = 6 + (r.tok / maxTok) * (tankH - 16);
      g += `<rect x="${x - tankW / 2 + 3}" y="${(tankY + tankH - 4 - mustH).toFixed(1)}" width="${tankW - 6}" height="${mustH.toFixed(1)}" fill="${tint}" opacity=".65"/>`;
      // cap of skins floating on the must
      g += `<path d="M ${x - tankW / 2 + 3} ${(tankY + tankH - 4 - mustH).toFixed(1)} q ${tankW * .15} -4 ${tankW * .3} 0 t ${tankW * .3} 0" stroke="${r.col}" stroke-width="1.2" fill="none" opacity=".7"/>`;
      // spout at the front lip
      g += `<rect x="${x - 5}" y="${tankY + tankH - 10}" width="10" height="5" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="2 2"' : ""}/>`;
      // treader knee-deep for live sessions
      if (r.live) {
        g += `<g class="lg-treader" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${tankY - 6})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-2" y1="13" x2="-3" y2="20" stroke="${r.col}" stroke-width="1.4"/>
          <line x1="2" y1="13" x2="3" y2="20" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // cracked spout on errors — drip
      if (r.err) g += `<path d="M ${x} ${tankY + tankH - 5} l 0 8" stroke="var(--red)" stroke-width="1.6" stroke-dasharray="2 3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lg-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "踏酒槽", eyebrow: "PROVIDER LAGAR", render };
})();
