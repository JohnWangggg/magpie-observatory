/* ---------------------------------------------------------------- cressbed
 * Cressbed view — a row of spring-fed beds, one per provider.
 * Cress tufts on the gravel = tokens; a gatherer with a knife for
 * live sessions; a fouled spring marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cressbed";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bedY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cb-empty">暂无水芹床</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // spring head behind
    for (let x = 0; x < W; x += 40) g += `<path d="M ${x} ${bedY - 10} q 20 -15 40 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bedW = seg * .7;
      const bedH = 30;
      const bedTop = bedY - bedH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68b078" : "#408858";
      // bed — rectangular channel with gravel bed
      g += `<rect x="${x - bedW / 2}" y="${bedTop}" width="${bedW}" height="${bedH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // water level — by remaining quota proxy (inverse of burn)
      const waterH = bedH * .5;
      g += `<rect x="${x - bedW / 2 + 2}" y="${(bedTop + 4).toFixed(0)}" width="${bedW - 4}" height="${waterH.toFixed(0)}" fill="#4a90c2" opacity=".3"/>`;
      // cress tufts — count by tokens
      const tufts = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let t = 0; t < tufts; t++) {
        const tx = x - bedW * .35 + t * (bedW * .7 / (tufts - 1 || 1));
        const ty = bedTop + 8 + (t % 2) * 4;
        g += `<ellipse cx="${tx.toFixed(0)}" cy="${ty.toFixed(0)}" rx="4" ry="2.5" fill="${tint}" opacity=".8"/>`;
        g += `<circle cx="${tx.toFixed(0)}" cy="${(ty - 3).toFixed(0)}" r="1.5" fill="${tint}"/>`;
      }
      // spring feed from back
      g += `<path d="M ${x} ${bedTop - 6} L ${x} ${bedTop}" stroke="${r.col}" stroke-width="1.4" marker-end="url(#arr)"/>`;
      // gatherer with knife for live sessions
      if (r.live) {
        g += `<g class="cb-gatherer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bedW / 2 + 12} ${bedY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="1" x2="9" y2="-3" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // fouled spring on errors
      if (r.err) g += `<circle cx="${x - bedW * .3}" cy="${bedTop + 6}" r="4" fill="var(--red)" opacity=".4"/>`;
      g += `<text x="${x}" y="${bedY + 18}" text-anchor="middle" class="cb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L3,3 z" fill="currentColor"/></marker></defs>
      ${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水芹床", eyebrow: "PROVIDER CRESSBED", render };
})();
