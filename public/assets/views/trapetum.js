/* ------------------------------------------------------------------- trapetum
 * Trapetum view — a row of olive mills, one per provider.
 * Oil run into the settling jars = tokens; a miller walking
 * the orbes for live sessions; a cracked mortarium marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "trapetum";
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
    if (!rows.length) { host.innerHTML = `<div class="tr-empty">暂无碾油坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // pressing-room floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const oil = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8b050" : "#988040";
      const bowlW = seg * .42;
      const bowlY = floorY - 24;
      // the mortarium — a stone bowl on a base
      g += `<path d="M ${x - bowlW / 2} ${bowlY} a ${bowlW / 2} ${bowlW * .32} 0 0 0 ${bowlW} 0" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<rect x="${x - bowlW * .32}" y="${floorY - 10}" width="${bowlW * .64}" height="8" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // the orbes — two rotating millstones on the pivot
      g += `<ellipse cx="${x - bowlW * .16}" cy="${bowlY + 6}" rx="6" ry="9" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<ellipse cx="${x + bowlW * .16}" cy="${bowlY + 6}" rx="6" ry="9" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.1"/>`;
      // the columella — a vertical pivot with the capulus beam
      g += `<line x1="${x}" y1="${bowlY + 14}" x2="${x}" y2="${bowlY - 8}" stroke="${r.col}" stroke-width="1.5"/>`;
      g += `<line x1="${x - bowlW * .3}" y1="${bowlY - 4}" x2="${x + bowlW * .3}" y2="${bowlY - 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      // olives in the bowl — a cluster of dots
      for (let o = 0; o < 3; o++) g += `<circle cx="${x - 6 + o * 6}" cy="${bowlY + 10}" r="2" fill="${r.col}" opacity=".55"/>`;
      // the runnel — oil channel to the settling jars
      g += `<line x1="${x + bowlW * .36}" y1="${bowlY + 12}" x2="${x + bowlW * .44}" y2="${floorY - 8}" stroke="${oil}" stroke-width="1.4"/>`;
      // settling jars — amphorae beside the bowl, count by tokens
      const jars = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let j = 0; j < jars; j++) {
        const jx = x + bowlW * .5 + j * 8;
        g += `<path d="M ${jx} ${floorY - 16} q 4 0 4 6 q 0 8 -4 10 q -4 -2 -4 -10 q 0 -6 4 -6" fill="${j === 0 && r.err ? "var(--red)" : oil}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // miller walking the capulus for live sessions — figure pushing the beam
      if (r.live) {
        g += `<g class="tr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bowlW * .34} ${bowlY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="7" x2="-14" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked mortarium — a split in the bowl on errors
      if (r.err) g += `<path d="M ${x - bowlW * .3} ${bowlY + 2} l 6 8" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "碾油坊", eyebrow: "PROVIDER TRAPETUM", render };
})();
