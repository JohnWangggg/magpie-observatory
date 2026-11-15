/* --------------------------------------------------------------- stewpond
 * Stewpond view — a row of monastic fishponds, one per provider.
 * Fish rising = tokens; a monk with a net for live sessions;
 * a leaked bund marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stewpond";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sp-empty">暂无鱼塘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bank
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pondW = seg * .7;
      const pondH = 26;
      const pondY = bankY - pondH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68a8d8" : "#4878a8";
      // pond — rectangular with sloping banks
      g += `<path d="M ${x - pondW / 2 - 6} ${bankY} L ${x - pondW / 2} ${pondY} L ${x + pondW / 2} ${pondY} L ${x + pondW / 2 + 6} ${bankY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // water
      g += `<rect x="${x - pondW / 2}" y="${pondY + 4}" width="${pondW}" height="${pondH - 8}" fill="#3a7098" opacity=".3"/>`;
      // fish — count by tokens
      const fish = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let f = 0; f < fish; f++) {
        const fx = x - pondW * .3 + f * (pondW * .6 / (fish - 1 || 1));
        const fy = pondY + 10 + (f % 2) * 6;
        g += `<ellipse cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" rx="4" ry="1.8" fill="${tint}" opacity=".8"/>`;
        g += `<path d="M ${(fx + 4).toFixed(0)} ${fy.toFixed(0)} l 3 -2 l 0 4 Z" fill="${tint}"/>`;
      }
      // monk with net for live sessions
      if (r.live) {
        g += `<g class="sp-monk" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pondW / 2 + 12} ${pondY - 2})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M -4 4 l 8 0 l 0 8 l -8 0 Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="8" cy="-2" r="5" fill="none" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="4" x2="8" y2="-2" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // leaked bund on errors — water escaping
      if (r.err) g += `<path d="M ${x - pondW * .3} ${pondY + pondH} l 0 6" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${bankY + 18}" text-anchor="middle" class="sp-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鱼塘", eyebrow: "PROVIDER STEWPOND", render };
})();
