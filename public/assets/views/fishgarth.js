/* ---------------------------------------------------------------- fishgarth
 * Fishgarth view — a row of wicker fish-garths, one per
 * provider. Catch lifted out of the garth = tokens; a garthman
 * netting for live sessions; a broken wattle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fishgarth";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fg-empty">暂无渔堰</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the stream
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="#1e3348" opacity=".5"/>`;
    for (let w = 0; w < 3; w++) {
      g += `<path d="M 0 ${waterY + 8 + w * 10} q ${W / 8} -3 ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0 t ${W / 4} 0" stroke="#3a5a78" stroke-width="1" fill="none" opacity=".5"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const garthW = seg * .5;
      const garthH = 36;
      const garthTop = waterY - garthH * .55;
      // the garth — a wattle funnel rooted in the stream
      g += `<path d="M ${x - garthW * .5} ${garthTop} L ${x - garthW * .3} ${waterY} L ${x + garthW * .3} ${waterY} L ${x + garthW * .5} ${garthTop} Z"
            fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // wattle mesh — horizontal + vertical weave
      for (let m = 0; m < 3; m++) {
        const my = garthTop + 8 + m * 9;
        const mw = garthW * .5 - m * (garthW * .05);
        g += `<line x1="${x - mw}" y1="${my}" x2="${x + mw}" y2="${my}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      }
      for (let m = 0; m < 3; m++) {
        const mx = x - garthW * .2 + m * (garthW * .2);
        g += `<line x1="${mx}" y1="${garthTop + 4}" x2="${x - garthW * .3 + m * (garthW * .3)}" y2="${waterY}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      }
      // catch — fish lifted in the garth, count by tokens
      const fish = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fish; f++) {
        const fx = x - garthW * .15 + f * (garthW * .12);
        const fy = waterY - 8 - f * 5;
        g += `<ellipse cx="${fx}" cy="${fy}" rx="5" ry="2" fill="${f === 0 && r.err ? "var(--red)" : "var(--cyan)"}" opacity=".85"/>`;
        g += `<path d="M ${fx + 5} ${fy} l 4 -3 l 0 6 Z" fill="${f === 0 && r.err ? "var(--red)" : "var(--cyan)"}" opacity=".85"/>`;
      }
      // garthman netting for live sessions
      if (r.live) {
        g += `<g class="fg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - garthW * .5 - 8} ${garthTop - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="16" y2="14" stroke="${r.col}" stroke-width="1"/>
          <ellipse cx="16" cy="14" rx="4" ry="2" stroke="${r.col}" fill="none" stroke-width=".8"/>
        </g>`;
      }
      // broken wattle — a gap in the weave on errors
      if (r.err) g += `<path d="M ${x - garthW * .2} ${garthTop + 14} l 6 8 l -8 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${waterY + 20}" text-anchor="middle" class="fg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "渔堰", eyebrow: "PROVIDER FISHGARTH", render };
})();
