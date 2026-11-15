/* --------------------------------------------------------------- blockmaker
 * Blockmaker view — a row of ship's blocks on a bench, one per
 * provider. Sheave grooves cut into each shell = tokens; a maker
 * reaming the pin hole for live sessions; a split shell marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "blockmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="bm-empty">暂无滑轮匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench top + legs
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += W / (rows.length + 1)) g += `<rect x="${x + 6}" y="${benchY}" width="6" height="${H - benchY}" fill="var(--card-3)" opacity=".7"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const shellW = seg * .3;
      const shellH = 34;
      const shellY = benchY - shellH - 10;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      // block shell — oblong wooden body
      g += `<rect x="${x - shellW / 2}" y="${shellY}" width="${shellW}" height="${shellH}" rx="${shellW * .45}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // sheaves inside — groove count by tokens (up to 3)
      const grooves = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      const grove = shellH / (grooves + 1);
      for (let s = 0; s < grooves; s++) {
        const sy = shellY + grove * (s + 1);
        g += `<circle cx="${x}" cy="${sy.toFixed(0)}" r="${(grove * .35).toFixed(0)}" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<circle cx="${x}" cy="${sy.toFixed(0)}" r="1" fill="var(--card-2)"/>`;
      }
      // strope + becket — rope loop through the block
      g += `<path d="M ${x - shellW * .3} ${shellY - 6} q ${shellW * .3} -8 ${shellW * .6} 0" stroke="${r.col}" stroke-width="1.4" fill="none"/>`;
      g += `<circle cx="${x + shellW * .3}" cy="${shellY - 4}" r="2.5" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // maker reaming the pin hole for live sessions
      if (r.live) {
        g += `<g class="bm-maker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + shellW / 2 + 12} ${shellY + 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-14" y2="4" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="-13" cy="4" r="1.5" fill="${tint}"/>
        </g>`;
      }
      // split shell — a crack running lengthwise on errors
      if (r.err) g += `<path d="M ${x - 4} ${shellY + 6} l 4 10 l -4 10" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="bm-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "滑轮匠", eyebrow: "PROVIDER BLOCKMAKER", render };
})();
