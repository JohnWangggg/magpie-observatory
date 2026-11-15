/* ------------------------------------------------------------------ granary
 * Granary view — a row of stilted granaries, one per provider.
 * Grain sacks piled inside = tokens; a farmer carrying
 * for live sessions; a burst sack marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "granary";
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
    if (!rows.length) { host.innerHTML = `<div class="gr-empty">暂无谷仓</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // barnyard ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const sack = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b860" : "#987848";
      const gW = seg * .44;
      const top = floorY - 44;
      const bot = floorY - 14;
      // stilts with rat guards
      for (let s = -1; s <= 1; s += 2) {
        g += `<line x1="${x + s * gW * .36}" y1="${bot}" x2="${x + s * gW * .36}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
        g += `<ellipse cx="${x + s * gW * .36}" cy="${bot + 5}" rx="4" ry="1.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // the crib body — slatted walls
      g += `<rect x="${x - gW / 2}" y="${top}" width="${gW}" height="${bot - top}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      for (let sl = 1; sl < 4; sl++) {
        g += `<line x1="${x - gW / 2}" y1="${top + sl * (bot - top) / 4}" x2="${x + gW / 2}" y2="${top + sl * (bot - top) / 4}" stroke="${r.col}" stroke-width=".5" opacity=".5"/>`;
      }
      // roof — pitched thatch
      g += `<path d="M ${x - gW * .58} ${top} L ${x} ${top - 14} L ${x + gW * .58} ${top}" fill="none" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x - gW * .5}" y1="${top - 4}" x2="${x + gW * .5}" y2="${top - 4}" stroke="${r.col}" stroke-width=".7" opacity=".5"/>`;
      // grain sacks visible through the slats, count by tokens
      const sacks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s2 = 0; s2 < sacks; s2++) {
        g += `<ellipse cx="${x - gW * .3 + s2 * gW * .2}" cy="${bot - 6}" rx="5" ry="4" fill="${s2 === 0 && r.err ? "var(--red)" : sack}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // ladder leaning on the crib
      g += `<line x1="${x - gW * .52}" y1="${floorY}" x2="${x - gW * .38}" y2="${top + 4}" stroke="${r.col}" stroke-width="1.1"/>`;
      for (let ld = 0; ld < 3; ld++) {
        const t = .25 + ld * .25;
        g += `<line x1="${x - gW * (.52 - .14 * t) - 3}" y1="${floorY - (floorY - top - 4) * t}" x2="${x - gW * (.52 - .14 * t) + 3}" y2="${floorY - (floorY - top - 4) * t}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // farmer carrying a sack for live sessions
      if (r.live) {
        g += `<g class="gr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - gW * .62} ${floorY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <ellipse cx="7" cy="2" rx="4" ry="3" fill="${sack}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // burst sack — spilled grain on errors
      if (r.err) {
        g += `<path d="M ${x + gW * .3} ${bot - 2} q 3 4 8 4" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
        for (let d = 0; d < 3; d++) g += `<circle cx="${x + gW * .34 + d * 3}" cy="${bot + 3}" r=".9" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "谷仓", eyebrow: "PROVIDER GRANARY", render };
})();
