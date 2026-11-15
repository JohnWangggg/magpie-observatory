/* -------------------------------------------------------------- harnessmaker
 * Harnessmaker view — a row of collar frames, one per provider.
 * Harness sets hung on the rack = tokens; a collarmaker
 * stitching for live sessions; a sprung trace marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harnessmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="hm-empty">暂无马具坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // saddlery floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const leather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0a060" : "#a07848";
      const frameW = seg * .4;
      const frameY = floorY - 34;
      const frameH = 26;
      // the collar frame — an arch on a stand
      g += `<path d="M ${x - frameW / 2} ${frameY + frameH} a ${frameW / 2} ${frameH} 0 0 1 ${frameW} 0" fill="none" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - frameW / 2 - 4}" y1="${frameY + frameH}" x2="${x - frameW / 2 - 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + frameW / 2 + 4}" y1="${frameY + frameH}" x2="${x + frameW / 2 + 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // harness sets — hanging straps inside the arch, count by tokens
      const sets = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < sets; s++) {
        const hx = x - frameW * .28 + s * (frameW * .56 / sets);
        g += `<path d="M ${hx} ${frameY + frameH - 4} q ${frameW * .08} -${frameH * .4} ${frameW * .16} 0" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : leather}" stroke-width="1.2"/>`;
        g += `<line x1="${hx + frameW * .08}" y1="${frameY + frameH - 4}" x2="${hx + frameW * .08}" y2="${frameY + frameH}" stroke="${leather}" stroke-width=".9"/>`;
      }
      // hames — the curved horns on the collar
      g += `<path d="M ${x - frameW * .18} ${frameY + frameH - 8} q -4 -10 0 -14" stroke="${leather}" stroke-width="1.4" fill="none"/>`;
      g += `<path d="M ${x + frameW * .18} ${frameY + frameH - 8} q 4 -10 0 -14" stroke="${leather}" stroke-width="1.4" fill="none"/>`;
      // traces — reins trailing to the floor
      g += `<line x1="${x - frameW * .28}" y1="${frameY + frameH}" x2="${x - frameW * .34}" y2="${floorY}" stroke="${leather}" stroke-width="1" opacity=".8"/>`;
      g += `<line x1="${x + frameW * .28}" y1="${frameY + frameH}" x2="${x + frameW * .34}" y2="${floorY}" stroke="${leather}" stroke-width="1" opacity=".8"/>`;
      // collarmaker stitching for live sessions — figure with a palm
      if (r.live) {
        g += `<g class="hm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .42} ${frameY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="7" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // sprung trace — a loose rein kinked on errors
      if (r.err) g += `<path d="M ${x + frameW * .3} ${floorY - 6} q 4 -8 8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "马具坊", eyebrow: "PROVIDER HARNESSMAKER", render };
})();
