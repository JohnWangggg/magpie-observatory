/* ------------------------------------------------------------ transporter
 * Transporter bridge view — a row of cantilevered spans, one per
 * provider. Cars on the travelling gondola = tokens; the gondola
 * shuttling for live sessions; a snapped hanger marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "transporter";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .86;
    const deckY = H * .30;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tb-empty">暂无运输桥</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="#2a4a68" opacity=".5"/>`;
    for (let x = 0; x < W; x += 30) g += `<path d="M ${x} ${waterY + 6} q 8 -4 16 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const spanW = seg * .7;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0b050" : "#a07838";
      // twin towers
      g += `<path d="M ${x - spanW / 2} ${waterY} L ${x - spanW / 2 + 4} ${deckY} L ${x - spanW / 2 + 10} ${deckY} L ${x - spanW / 2 + 6} ${waterY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<path d="M ${x + spanW / 2} ${waterY} L ${x + spanW / 2 - 4} ${deckY} L ${x + spanW / 2 - 10} ${deckY} L ${x + spanW / 2 - 6} ${waterY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // high-level girder deck
      g += `<rect x="${x - spanW / 2 + 4}" y="${deckY - 4}" width="${spanW - 8}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      for (let t = 0; t < 5; t++) g += `<line x1="${(x - spanW / 2 + 8 + t * (spanW - 16) / 4).toFixed(0)}" y1="${deckY - 4}" x2="${(x - spanW / 2 + 12 + t * (spanW - 16) / 4).toFixed(0)}" y2="${deckY + 1}" stroke="${r.col}" stroke-width=".6" opacity=".5"/>`;
      // hanger + gondola platform
      const gonY = waterY - 14;
      const gonW = spanW * .4;
      g += `<line x1="${x}" y1="${deckY + 1}" x2="${x}" y2="${gonY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<rect x="${x - gonW / 2}" y="${gonY}" width="${gonW}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // cars on gondola — count by tokens
      const cars = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cars; c++) {
        const cx = x - gonW / 2 + 6 + c * 14;
        g += `<g class="tb-car" style="animation-delay: ${(i * .3 + c * .2).toFixed(1)}s">
          <rect x="${cx.toFixed(0)}" y="${gonY - 9}" width="12" height="7" rx="2" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
          <circle cx="${cx + 3}" cy="${gonY - 1}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>
          <circle cx="${cx + 9}" cy="${gonY - 1}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // snapped hanger on errors
      if (r.err) g += `<path d="M ${x + 4} ${deckY + 10} l 4 -8 m -4 2 l -4 -8" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${waterY + 16}" text-anchor="middle" class="tb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "运输桥", eyebrow: "PROVIDER TRANSPORTER", render };
})();
