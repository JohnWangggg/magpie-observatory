/* -------------------------------------------------------------- topography
 * Topography view — a relief map of providers. Each provider is a
 * ridge silhouette: summit height = recent token volume, live sessions
 * are flags on the peaks, errors mark a scree slope in red.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "topography";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const base = H * 0.86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);

    if (!rows.length) { host.innerHTML = `<div class="tp-empty">暂无地形</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // baseline
    g += `<line y="${base}" x2="${W}" y2="${base}" stroke="var(--line)" stroke-width="1.6"/>`;
    // sea level hatch
    for (let x = 0; x < W; x += 30) g += `<line x1="${x}" y1="${base + 4}" x2="${x + 14}" y2="${base + 4}" stroke="var(--faint)" stroke-width=".5" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const cx = seg * (i + 1);
      const peakH = 40 + (r.tok / maxTok) * (base - 80);
      const ridgeW = seg * .72;
      // ridge silhouette
      g += `<path d="M ${(cx - ridgeW / 2).toFixed(0)} ${base} L ${cx.toFixed(0)} ${(base - peakH).toFixed(0)} L ${(cx + ridgeW / 2).toFixed(0)} ${base}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.6" stroke-linejoin="round"/>`;
      // contour rings — horizontal slices
      for (let c = 1; c <= 3; c++) {
        const frac = c / 3.4, ry = base - peakH * frac;
        const halfW = (ridgeW / 2) * (1 - frac * .8);
        g += `<line x1="${(cx - halfW).toFixed(0)}" y1="${ry.toFixed(0)}" x2="${(cx + halfW).toFixed(0)}" y2="${ry.toFixed(0)}" stroke="${r.col}" stroke-width=".7" opacity=".5"/>`;
      }
      // flag at summit if live
      if (r.live) {
        g += `<g class="tp-flag" transform="translate(${cx},${(base - peakH).toFixed(0)})">
          <line x1="0" y1="0" x2="0" y2="-14" stroke="${r.col}" stroke-width="1.4"/>
          <path d="M 0 -14 L 10 -11 L 0 -8 Z" fill="${r.col}"/>
        </g>`;
      }
      // scree dots for errors
      if (r.err) {
        for (let d = 0; d < 5; d++) {
          const dx = cx + ridgeW * .18 + (d % 3) * 4;
          const dy = base - 6 - (d * 5);
          g += `<circle cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" r="${1.4 - d * .15}" fill="var(--red)" opacity=".8"/>`;
        }
      }
      g += `<text x="${cx.toFixed(0)}" y="${base + 18}" text-anchor="middle" class="tp-lab">${esc(r.name.split("/").pop().slice(0, 9))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "地形", eyebrow: "PROVIDER TOPOGRAPHY", render };
})();
