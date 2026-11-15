/* --------------------------------------------------------------- ashlaryard
 * Ashlar yard view — a row of banker benches, one per provider.
 * Dressed blocks stacked beside the bench = tokens; a dresser
 * chiselling for live sessions; a spalled edge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ashlaryard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ay-empty">暂无琢石场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard ground
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8c0b0" : "#989080";
      const benchY = yardY - 16;
      // banker bench — a stout trestle table
      g += `<rect x="${x - seg * .3}" y="${benchY}" width="${seg * .6}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - seg * .24}" y1="${benchY + 6}" x2="${x - seg * .24}" y2="${yardY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + seg * .24}" y1="${benchY + 6}" x2="${x + seg * .24}" y2="${yardY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // a block on the bench being dressed
      g += `<rect x="${x - 10}" y="${benchY - 10}" width="20" height="10" rx="1" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // dressed face — chisel marks
      for (let c = 0; c < 3; c++) g += `<line x1="${x - 7 + c * 6}" y1="${benchY - 8}" x2="${x - 7 + c * 6}" y2="${benchY - 2}" stroke="var(--line)" stroke-width=".7" opacity=".6"/>`;
      // dressed blocks stacked beside — count by tokens
      const blocks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < blocks; b++) {
        g += `<rect x="${x + seg * .32}" y="${yardY - 8 - b * 9}" width="14" height="8" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".9"/>`;
      }
      // dresser chiselling for live sessions
      if (r.live) {
        g += `<g class="ay-dresser" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3 - 8} ${benchY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="2" x2="12" y2="-2" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="12" cy="-2" r="1.5" fill="${tint}"/>
        </g>`;
      }
      // spalled edge — a chipped corner on errors
      if (r.err) g += `<path d="M ${x + 6} ${benchY - 10} l 4 4 l -6 2" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="ay-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ay-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "琢石场", eyebrow: "PROVIDER ASHLARYARD", render };
})();
