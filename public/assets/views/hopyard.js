/* ------------------------------------------------------------------- hopyard
 * Hopyard view — a row of hop trellises, one per provider.
 * Bines climbing the strings = tokens; a picker working
 * for live sessions; a snapped string marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hopyard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="hy-empty">暂无啤酒花架</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // field ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const leaf = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68b050" : "#4a8040";
      const treW = seg * .42;
      const topY = floorY - 40;
      // the trellis — two poles + a top wire
      g += `<line x1="${x - treW / 2}" y1="${floorY}" x2="${x - treW / 2}" y2="${topY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + treW / 2}" y1="${floorY}" x2="${x + treW / 2}" y2="${topY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - treW / 2}" y1="${topY}" x2="${x + treW / 2}" y2="${topY}" stroke="${r.col}" stroke-width="1"/>`;
      // strings — vertical twines hanging from the wire
      for (let s = 0; s < 4; s++) {
        const sx = x - treW * .36 + s * treW * .24;
        g += `<line x1="${sx}" y1="${topY}" x2="${sx}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".6" opacity=".5"/>`;
      }
      // bines — leafy vines climbing the strings, count by tokens
      const bines = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bines; b++) {
        const bx = x - treW * .36 + b * treW * .24;
        const bh = (floorY - 6 - topY) * (b === 0 ? .9 : .6 + .3 * ((b + i) % 2));
        // a zigzag climbing bine
        g += `<path d="M ${bx} ${floorY - 6} q -3 ${-bh * .3} 0 ${-bh * .5} q 3 ${-bh * .2} 0 ${-bh * .5}" fill="none" stroke="${b === 0 && r.err ? "var(--red)" : leaf}" stroke-width="1.1"/>`;
        // leaf ticks
        for (let l = 0; l < 3; l++) {
          g += `<path d="M ${bx - 1} ${floorY - 8 - l * bh * .3} q -3 -1 -4 -4" fill="none" stroke="${leaf}" stroke-width=".8"/>`;
        }
        // hop cone at the top of the tallest bine
        if (b === 0) g += `<path d="M ${bx} ${floorY - 6 - bh} l -3 -5 l 6 0 z" fill="${r.err ? "var(--red)" : leaf}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // picker working for live sessions — figure on a ladder by the trellis
      if (r.live) {
        g += `<g class="hy-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + treW * .4} ${topY + 6})">
          <line x1="0" y1="0" x2="0" y2="${floorY - topY - 10}" stroke="${r.col}" stroke-width=".8"/>
          <line x1="4" y1="0" x2="4" y2="${floorY - topY - 10}" stroke="${r.col}" stroke-width=".8"/>
          <circle cx="2" cy="4" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-1" y="7" width="6" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-1" y1="11" x2="-8" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snapped string — a broken twine on errors
      if (r.err) g += `<path d="M ${x - treW * .12} ${topY + 8} q 3 4 0 8" fill="none" stroke="var(--red)" stroke-width="1.3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "啤酒花架", eyebrow: "PROVIDER HOPYARD", render };
})();
