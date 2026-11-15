/* --------------------------------------------------------------------- quern
 * Quern view — a row of rotary querns, one per provider.
 * Flour heaps sieved beside = tokens; a grinder turning
 * the handle for live sessions; a cracked stone marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "quern";
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
    if (!rows.length) { host.innerHTML = `<div class="qu-empty">暂无手磨坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const meal = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0d0a8" : "#a09068";
      const qW = seg * .36;
      // the quern — two stones: flat bedstone + domed runner with handle
      g += `<ellipse cx="${x}" cy="${floorY - 4}" rx="${qW * .32}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - qW * .3} ${floorY - 5} a ${qW * .3} 12 0 0 1 ${qW * .6} 0 l 0 4 q -${qW * .3} 6 -${qW * .6} 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // feed hole and the wooden handle on the runner
      g += `<ellipse cx="${x}" cy="${floorY - 13}" rx="3" ry="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + qW * .14}" y1="${floorY - 12}" x2="${x + qW * .26}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x + qW * .27}" cy="${floorY - 21}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // meal spilling from the stone's edge
      g += `<path d="M ${x - qW * .34} ${floorY - 3} q -4 3 -2 5" fill="none" stroke="${meal}" stroke-width="1.4"/>`;
      // grain hopper beside — a basket of ears
      g += `<path d="M ${x - qW * .62} ${floorY - 8} l 2 -5 h 8 l 2 5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      for (let e = 0; e < 3; e++) {
        g += `<path d="M ${x - qW * .62 + 3 + e * 3} ${floorY - 11} q 0 -5 1 -7" fill="none" stroke="${e === 0 && r.err ? "var(--red)" : meal}" stroke-width=".9"/>`;
      }
      // sieved flour heaps — mounds on a cloth, count by tokens
      g += `<rect x="${x + qW * .34}" y="${floorY - 4}" width="${qW * .34}" height="4" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      const heaps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < heaps; h++) {
        g += `<path d="M ${x + qW * .36 + h * qW * .11} ${floorY - 4} q 3 -8 6 0 z" fill="${h === 0 && r.err ? "var(--red)" : meal}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a sieve leaning
      g += `<circle cx="${x + qW * .72}" cy="${floorY - 10}" r="5" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x + qW * .72}" cy="${floorY - 10}" r="3" fill="none" stroke="${r.col}" stroke-width=".5" stroke-dasharray="1.5 1.2"/>`;
      // grinder turning for live sessions — kneeling figure on the handle
      if (r.live) {
        g += `<g class="qu-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - qW * .3} ${floorY - 24})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="14" y2="5" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked stone — a split in the runner on errors
      if (r.err) g += `<path d="M ${x - qW * .1} ${floorY - 12} l 5 4 l -2 4" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="qu-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="qu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "手磨坊", eyebrow: "PROVIDER QUERN", render };
})();
