/* ----------------------------------------------------------------- clinker
 * Clinker view — the last N requests stacked as fired bricks. Brick
 * colour = provider, face tint deepens with tokens; a cracked face
 * with red line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "clinker";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = 3, cols = Math.min(9, Math.ceil(Math.sqrt(logs.length * W / (H * rows))) || 7);
    const pad = 20, cw = (W - pad * 2) / cols, ch = (H - pad * 2 - 16) / rows;

    const stones = logs.slice(-rows * cols);
    if (!stones.length) { host.innerHTML = `<div class="ck-empty">暂无砖堆</div>`; return; }
    const maxTok = Math.max(1, ...stones.map(l => l.tokens || 0));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mortar bed
    g += `<rect x="${pad}" y="${H - pad - 16}" width="${W - pad * 2}" height="4" fill="var(--line)"/>`;

    stones.forEach((l, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const cx = pad + c * cw, cy = pad + r * ch;
      const err = l.status === "err";
      const col = err ? "#e06048" : (metaOf(l.provider).color || "#8b7cf6");
      const heat = .3 + (l.tokens / maxTok) * .55;
      const bw = cw * .82, bh = ch * .72;
      const x = cx + (cw - bw) / 2, y = cy + (ch - bh) / 2;
      // brick face — offset courses
      const off = (r % 2) * (cw * .14);
      g += `<g class="ck-brick">
        <rect x="${(x + off).toFixed(0)}" y="${y.toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" rx="1.5" fill="${col}" opacity="${heat.toFixed(2)}" stroke="${col}" stroke-width="1.2"/>
        <rect x="${(x + off + 3).toFixed(0)}" y="${(y + 3).toFixed(0)}" width="${(bw - 6).toFixed(0)}" height="${(bh - 6).toFixed(0)}" fill="var(--card-2)" opacity=".5"/>
        ${err ? `<path d="M ${x + off + 3} ${y + 4} L ${x + off + bw - 4} ${y + bh - 4} M ${x + off + bw - 6} ${y + 4} L ${x + off + 4} ${y + bh - 4}" stroke="${col}" stroke-width="1.2"/>` : ""}
        <text x="${(x + off + bw / 2).toFixed(0)}" y="${(y + bh / 2 + 3).toFixed(0)}" text-anchor="middle" class="ck-t">${(l.tokens / 1000).toFixed(1)}k</text>
      </g>`;
    });

    host.innerHTML = `<svg class="ck-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "烧结砖", eyebrow: "LOG CLINKER", render };
})();
