/* ---------------------------------------------------------------- flotsam
 * Flotsam view — the last N requests as bottles bobbing on the water.
 * Bottle tint = provider, cork height = tokens, a shattered bottle
 * shows a cracked hull and red rim for errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "flotsam";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const seaY = H * 0.62;
    const n = Math.min(14, logs.length);
    if (!n) { host.innerHTML = `<div class="fl-empty">暂无漂流物</div>`; return; }
    const stones = logs.slice(-n);
    const maxTok = Math.max(1, ...stones.map(l => l.tokens || 0));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sea band
    g += `<rect y="${seaY}" width="${W}" height="${H - seaY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<path d="M ${x} ${seaY + 4} q 6 -5 12 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;
    for (let x = 0; x < W; x += 36) g += `<path d="M ${x} ${seaY + 16} q 9 -7 18 0" stroke="var(--faint)" stroke-width=".7" fill="none" opacity=".35"/>`;

    const step = (W - 40) / n;
    stones.forEach((l, i) => {
      const x = 20 + i * step + step / 2;
      const bobY = seaY - 8 - ((i * 7) % 11);
      const err = l.status === "err";
      const col = err ? "#e06048" : (metaOf(l.provider).color || "#8b7cf6");
      const tokH = 6 + (l.tokens / maxTok) * 14;
      // bottle body — capsule
      const bw = step * .55, bh = 16;
      g += `<g class="fl-bottle" style="animation-delay: ${(i * .35).toFixed(1)}s">
        <rect x="${(x - bw / 2).toFixed(0)}" y="${(bobY - bh / 2).toFixed(0)}" width="${bw.toFixed(0)}" height="${bh}" rx="${bh / 2}" fill="var(--card-3)" stroke="${col}" stroke-width="1.4" ${err ? 'stroke-dasharray="4 2"' : ""}/>
        <rect x="${(x - bw / 2 + 4).toFixed(0)}" y="${(bobY - tokH / 2).toFixed(0)}" width="${(bw - 8).toFixed(0)}" height="${tokH.toFixed(0)}" rx="2" fill="${col}" opacity=".35"/>
        <rect x="${(x - 4).toFixed(0)}" y="${(bobY - bh / 2 - 5).toFixed(0)}" width="8" height="6" rx="2" fill="var(--card-2)" stroke="${col}" stroke-width="1"/>
        ${err ? `<line x1="${(x - bw / 2 + 3).toFixed(0)}" y1="${(bobY - bh / 2 + 2).toFixed(0)}" x2="${(x + bw / 2 - 3).toFixed(0)}" y2="${(bobY + bh / 2 - 2).toFixed(0)}" stroke="${col}" stroke-width="1.2"/>` : ""}
      </g>`;
    });

    host.innerHTML = `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "漂流瓶", eyebrow: "LOG FLOTSAM", render };
})();
