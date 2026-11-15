/* ---------------------------------------------------------------- geodesic
 * Geodesic view — a half-dome of recent requests. The last N logs tile
 * a dome silhouette; each triangle's colour is the provider, and error
 * panels crack outward with a red edge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "geodesic";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H * 0.88;
    const domeR = Math.min(W * .38, H * .78);
    const rows = 4, per = 8;

    const stones = logs.slice(-rows * per);
    if (!stones.length) { host.innerHTML = `<div class="gd-empty">暂无穹顶</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground line
    g += `<line y="${cy}" x2="${W}" y2="${cy}" stroke="var(--line)" stroke-width="1.6"/>`;
    g += `<line y="${cy + 6}" x2="${W}" y2="${cy + 6}" stroke="var(--faint)" stroke-width=".7" opacity=".5"/>`;

    // dome skeleton — radial ribs and lat rings
    const ribN = 9;
    for (let r = 0; r <= ribN; r++) {
      const a = Math.PI - (r / ribN) * Math.PI;
      const x1 = cx + Math.cos(a) * domeR, y1 = cy - Math.sin(a) * domeR * .62;
      g += `<line x1="${cx}" y1="${cy}" x2="${x1.toFixed(0)}" y2="${y1.toFixed(0)}" stroke="var(--line)" stroke-width=".9"/>`;
    }
    for (let lat = 1; lat <= 4; lat++) {
      const a = (lat / 4.5) * Math.PI * .48;
      const ry = cy - Math.sin(a) * domeR * .62;
      const rw = Math.cos(a) * domeR;
      g += `<ellipse cx="${cx}" cy="${ry.toFixed(0)}" rx="${rw.toFixed(0)}" ry="${(rw * .18).toFixed(0)}" fill="none" stroke="var(--line)" stroke-width=".8"/>`;
    }

    // facets — triangles between ribs and lats
    let i = 0;
    stones.forEach((l, i) => {
      const ring = Math.floor(i / per), seg = i % per;
      if (ring >= rows) return;
      const a0 = Math.PI - (seg / per) * Math.PI;
      const a1 = Math.PI - ((seg + 1) / per) * Math.PI;
      const r0 = 1 - (ring / rows) * .8, r1 = 1 - ((ring + 1) / rows) * .8;
      const p0x = cx + Math.cos(a0) * domeR * r0, p0y = cy - Math.sin(a0) * domeR * .62 * r0;
      const p1x = cx + Math.cos(a1) * domeR * r0, p1y = cy - Math.sin(a1) * domeR * .62 * r0;
      const p2x = cx + Math.cos((a0 + a1) / 2) * domeR * r1, p2y = cy - Math.sin((a0 + a1) / 2) * domeR * .62 * r1;
      const err = l.status === "err";
      const col = err ? "#e06048" : (metaOf(l.provider).color || "#8b7cf6");
      g += `<path class="gd-tri" d="M ${p0x.toFixed(0)} ${p0y.toFixed(0)} L ${p1x.toFixed(0)} ${p1y.toFixed(0)} L ${p2x.toFixed(0)} ${p2y.toFixed(0)} Z"
        fill="${col}" opacity=".28" stroke="${col}" stroke-width="1" ${err ? 'stroke-dasharray="3 2"' : ""}/>`;
      if (err) g += `<line x1="${p0x.toFixed(0)}" y1="${p0y.toFixed(0)}" x2="${p2x.toFixed(0)}" y2="${p2y.toFixed(0)}" stroke="${col}" stroke-width="1.4" opacity=".9"/>`;
    });

    host.innerHTML = `<svg class="gd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "穹顶", eyebrow: "LOG GEODESIC", render };
})();
