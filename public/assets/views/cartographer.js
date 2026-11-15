/* ------------------------------------------------------------ cartographer
 * Cartographer view — usage hills rendered as a hand-drawn topo map.
 * Each provider's daily volume becomes a peak; contour rings + a tiny
 * flag mark the summit. Sessions are hikers' flags already planted.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cartographer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    // per-provider token sum → peak height
    const provTok = new Map();
    logs.forEach(l => {
      const p = l.provider || "?";
      provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0));
    });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 6);

    if (!rows.length) { host.innerHTML = `<div class="ct-empty">暂无地形数据</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--card-2)" opacity=".6"/>`;

    // subtle grid paper
    for (let x = 0; x < W; x += 44) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".4" opacity=".3"/>`;
    for (let y = 0; y < H; y += 44) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="var(--line)" stroke-width=".4" opacity=".3"/>`;

    rows.forEach((r, i) => {
      const cx = (W / (rows.length + 1)) * (i + 1) + (i % 2 ? 22 : -14);
      const cy = H * .62 - (i % 2) * 14;
      const hFrac = r.tok / maxTok;
      const peakH = 30 + hFrac * 110;
      const base = H * 0.82 - (i % 3) * 6;

      // contour rings (inner→outer)
      for (let c = 1; c <= 4; c++) {
        const rr = (peakH * c) / 4.6;
        const ry = cy - c * (peakH / 4.2);
        const ellipse = `<ellipse cx="${cx.toFixed(0)}" cy="${ry.toFixed(0)}" rx="${rr.toFixed(0)}" ry="${(rr * .28).toFixed(0)}" fill="none" stroke="${r.col}" stroke-width="${.7 + c * .2}" opacity="${.18 + c * .12}"/>`;
        g += ellipse;
      }
      // ridgeline + flag
      g += `<path d="M ${cx - 30} ${base} L ${cx} ${base - peakH} L ${cx + 30} ${base} Z" fill="none" stroke="${r.col}" stroke-width="1.6" stroke-linejoin="round"/>`;
      g += `<path d="M ${cx - 30} ${base} L ${cx} ${base - peakH} L ${cx + 30} ${base}" fill="none" stroke="var(--faint)" stroke-width=".5" stroke-dasharray="3 3" opacity=".4"/>`;
      // flag at summit — planted if live
      const flagCol = r.live ? r.col : "var(--faint)";
      g += `<g class="ct-flag" transform="translate(${cx},${(base - peakH).toFixed(0)})">
        <line x1="0" y1="0" x2="0" y2="-14" stroke="${flagCol}" stroke-width="1.2"/>
        <path d="M 0 -14 L 10 -11 L 0 -8 Z" fill="${flagCol}"/>
      </g>`;
      // name tag
      g += `<text x="${cx.toFixed(0)}" y="${(base + 14).toFixed(0)}" text-anchor="middle" class="ct-lab">${esc(r.name.split("/").pop().slice(0, 10))} · ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}</text>`;
      // compass rose per row? no — one per map, top-right
      if (i === 0) {
        g += `<g class="ct-rose" transform="translate(${W - 44},40)">
          <circle r="16" fill="none" stroke="var(--faint)" stroke-width=".7"/>
          <path d="M 0 -14 L 2 0 L 0 14 L -2 0 Z" fill="var(--fg-2)"/>
          <text y="-20" text-anchor="middle" class="ct-rose-n">N</text>
        </g>`;
      }
    });

    host.innerHTML = `<svg class="ct-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "地图师", eyebrow: "USAGE CARTOGRAPHY", render };
})();
