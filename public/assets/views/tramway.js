/* ---------------------------------------------------------------- tramway
 * Tramway view — an aerial cable run per provider. The cable sags
 * with remaining quota; gondolas slide for live sessions; a snapped
 * cable shows a broken line for errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tramway";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const top = Math.min(4, Math.max(1, sessions.length || 4));
    const skyY = 26, groundY = H * 0.88;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, top);
    if (!rows.length) { host.innerHTML = `<div class="tw-empty">暂无索道</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mountains behind
    g += `<path d="M 0 ${groundY} L ${W * .18} ${groundY - 60} L ${W * .38} ${groundY} Z" fill="var(--card-2)" opacity=".5"/>`;
    g += `<path d="M ${W * .55} ${groundY} L ${W * .75} ${groundY - 70} L ${W} ${groundY} Z" fill="var(--card-2)" opacity=".5"/>`;
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    rows.forEach((r, i) => {
      const x1 = 60 + (i * (W - 120)) / Math.max(1, rows.length - 1 || 1);
      const x2 = W - 60 - ((rows.length - 1 - i) * (W - 120)) / Math.max(1, rows.length - 1 || 1);
      const y1 = skyY + i * 30, y2 = skyY + (rows.length - 1 - i) * 30;
      const midY = (y1 + y2) / 2 + 14 + (r.tok % 20);
      // support pylons
      g += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${groundY}" stroke="var(--line)" stroke-width="1.6"/>`;
      g += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${groundY}" stroke="var(--line)" stroke-width="1.6"/>`;
      g += `<circle cx="${x1}" cy="${y1}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x2}" cy="${y2}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // cable — sagging quadratic
      const sag = r.err ? 40 : 10;
      g += `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${midY + sag} ${x2} ${y2}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" fill="none" ${r.err ? 'stroke-dasharray="5 4"' : ""}/>`;
      // gondolas for live sessions — cabins hanging from cable
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const t = .25 + s * .25;
        const gx = x1 + (x2 - x1) * t;
        const gy = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * (midY + sag - (y1 + y2) / 2);
        g += `<g class="tw-car" style="animation-delay: ${(s * .6).toFixed(1)}s">
          <line x1="${gx.toFixed(0)}" y1="${gy.toFixed(0)}" x2="${gx.toFixed(0)}" y2="${gy + 10}" stroke="${r.col}" stroke-width="1.2"/>
          <rect x="${(gx - 7).toFixed(0)}" y="${(gy + 10).toFixed(0)}" width="14" height="9" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="${(gx - 3).toFixed(0)}" cy="${(gy + 14).toFixed(0)}" r="1.5" fill="${r.col}"/>
          <circle cx="${(gx + 3).toFixed(0)}" cy="${(gy + 14).toFixed(0)}" r="1.5" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${(x1 + x2) / 2}" y="${midY + sag + 24}" text-anchor="middle" class="tw-lab">${esc(r.name.split("/").pop().slice(0, 9))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缆车", eyebrow: "PROVIDER TRAMWAY", render };
})();
