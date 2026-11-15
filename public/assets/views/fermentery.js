/* -------------------------------------------------------------- fermentery
 * Fermentery view — a row of carboys on a bench, one per provider.
 * Bubbling airlock activity = tokens; a blow-off tube hisses for
 * live sessions; a cracked carboy marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fermentery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fm-empty">暂无发酵桶</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<line x1="${x}" y1="${benchY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const carW = seg * .5;
      const carH = 56 + (r.tok / maxTok) * 24;
      const carY = benchY - carH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a848" : "#a08858";
      // carboy body — demijohn shape
      g += `<path d="M ${x - carW / 2} ${carY + carH * .2} Q ${x - carW / 2} ${carY} ${x} ${carY} Q ${x + carW / 2} ${carY} ${x + carW / 2} ${carY + carH * .2} L ${x + carW * .35} ${benchY} L ${x - carW * .35} ${benchY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // liquid level
      const liqH = carH * .5;
      const liqY = benchY - liqH;
      g += `<path d="M ${x - carW * .35} ${liqY} L ${x + carW * .35} ${liqY} L ${x + carW * .35} ${benchY} L ${x - carW * .35} ${benchY} Z" fill="${tint}" opacity=".4"/>`;
      // krausen ring on top
      g += `<ellipse cx="${x}" cy="${liqY}" rx="${carW * .32}" ry="${carW * .1}" fill="${tint}" opacity=".6"/>`;
      // bubbles inside — count by tokens
      const bubb = Math.min(7, Math.ceil(r.tok / maxTok * 7));
      for (let b = 0; b < bubb; b++) {
        const bx = x - carW * .2 + (b / (bubb - 1 || 1)) * carW * .4;
        const by = benchY - 10 - (b * 5) % (liqH - 6);
        g += `<circle class="fm-bubb" style="animation-delay: ${(i * .3 + b * .2).toFixed(1)}s" cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${(3 - b * .3).toFixed(1)}" fill="${tint}" opacity=".7"/>`;
      }
      // airlock on bung
      g += `<line x1="${x}" y1="${carY}" x2="${x}" y2="${carY - 12}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<path d="M ${x - 3} ${carY - 12} L ${x - 3} ${carY - 20} Q ${x} ${carY - 24} ${x + 3} ${carY - 20} L ${x + 3} ${carY - 12}" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<ellipse cx="${x}" cy="${carY - 18}" rx="2.5" ry="3" fill="${tint}" opacity=".8"/>`;
      // blow-off tube for live sessions
      if (r.live) {
        g += `<g class="fm-blow" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x + carW * .35}" y1="${carY + carH * .3}" x2="${x + carW * .35 + 12}" y2="${carY + carH * .3 - 8}" stroke="${r.col}" stroke-width="1.4"/>
          <circle cx="${x + carW * .35 + 14}" cy="${carY + carH * .3 - 10}" r="2" fill="${r.col}"/>
        </g>`;
      }
      // cracked carboy on errors
      if (r.err) g += `<path d="M ${x - carW * .2} ${carY + carH * .3} L ${x + carW * .05} ${carY + carH * .55} L ${x - carW * .1} ${carY + carH * .75}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="fm-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "发酵坊", eyebrow: "PROVIDER FERMENTERY", render };
})();
