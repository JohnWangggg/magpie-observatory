/* -------------------------------------------------------------- flagstone
 * Flagstone view — a pavement of recent requests. Each log lays a
 * paving slab: width tracks tokens, colour the provider, and an
 * error stone shows a crack line and chipped corners.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "flagstone";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = 4, cols = Math.min(10, Math.ceil(Math.sqrt(logs.length * W / (H * rows))) || 8);
    const pad = 18, cw = (W - pad * 2) / cols, ch = (H - pad * 2 - 18) / rows;

    const stones = logs.slice(-rows * cols);
    if (!stones.length) { host.innerHTML = `<div class="fs-empty">暂无石板</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mortar lines
    for (let y = 0; y <= rows; y++) g += `<line x1="${pad}" y1="${pad + y * ch}" x2="${W - pad}" y2="${pad + y * ch}" stroke="var(--line)" stroke-width="1"/>`;
    for (let x = 0; x <= cols; x++) g += `<line x1="${pad + x * cw}" y1="${pad}" x2="${pad + x * cw}" y2="${H - pad - 18}" stroke="var(--line)" stroke-width="1"/>`;

    stones.forEach((l, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const cx = pad + c * cw, cy = pad + r * ch;
      const err = l.status === "err";
      const col = err ? "#e06048" : (metaOf(l.provider).color || "#8b7cf6");
      const w = cw * (.5 + Math.min(1, (l.tokens || 0) / 30000) * .42);
      const h = ch * .78;
      const x = cx + (cw - w) / 2, y = cy + (ch - h) / 2;
      // slab — slightly rotated like real flagstones
      const rot = ((i * 37) % 11 - 5) * .6;
      g += `<g class="fs-stone" style="transform: rotate(${rot}deg); transform-origin: ${(cx + cw / 2).toFixed(0)}px ${(cy + ch / 2).toFixed(0)}px;">
        <rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="var(--card-2)" stroke="${col}" stroke-width="1.2"/>
        ${err ? `<path d="M ${x + 4} ${y + 4} L ${x + w - 6} ${y + h - 6} M ${x + w - 8} ${y + 4} L ${x + 4} ${y + h - 4}" stroke="${col}" stroke-width="1.2" opacity=".9"/>` : ""}
        <text x="${(cx + cw / 2).toFixed(0)}" y="${(cy + ch / 2 + 3).toFixed(0)}" text-anchor="middle" class="fs-t">${(l.tokens / 1000).toFixed(1)}k</text>
      </g>`;
    });

    host.innerHTML = `<svg class="fs-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石板路", eyebrow: "LOG FLAGSTONES", render };
})();
