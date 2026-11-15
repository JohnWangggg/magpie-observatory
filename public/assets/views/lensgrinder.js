/* -------------------------------------------------------------- lensgrinder
 * Lensgrinder view — a row of grinding laps, one per provider.
 * Figured mirrors on the pitch = tokens; an optician working
 * the null test for live sessions; a starved lap marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lensgrinder";
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
    if (!rows.length) { host.innerHTML = `<div class="lg-empty">暂无磨镜坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // optics-floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const glass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a0c8e0" : "#7888a0";
      const lapW = seg * .4;
      const lapY = floorY - 26;
      // the grinding lap — a rotating disc on a stand
      g += `<line x1="${x - lapW * .28}" y1="${floorY}" x2="${x - lapW * .28}" y2="${lapY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + lapW * .28}" y1="${floorY}" x2="${x + lapW * .28}" y2="${lapY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<ellipse cx="${x}" cy="${lapY}" rx="${lapW * .3}" ry="${lapW * .09}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // pitch facets — a cross-hatch of squares on the lap face
      for (let f = -1; f <= 1; f++) {
        g += `<line x1="${x + f * lapW * .15}" y1="${lapY - 2}" x2="${x + f * lapW * .15}" y2="${lapY + 2}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      }
      // the mirror being worked — a concave disc above the lap
      g += `<ellipse cx="${x}" cy="${lapY - lapW * .14}" rx="${lapW * .24}" ry="${lapW * .06}" fill="${glass}" stroke="${r.col}" stroke-width="1" opacity="${r.err ? ".9" : ".75"}"/>`;
      // rouge smear — a polishing stain on the mirror edge
      g += `<path d="M ${x - lapW * .1} ${lapY - lapW * .16} q ${lapW * .1} 4 ${lapW * .2} 0" stroke="#c05038" stroke-width="1" fill="none" opacity=".7"/>`;
      // figured mirrors on the shelf — discs by tokens
      const mirrors = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < mirrors; m++) {
        g += `<ellipse cx="${x + lapW * .38}" cy="${floorY - 6 - m * 6}" rx="4" ry="2" fill="${glass}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // knife-edge — a Foucault tester beside the lap
      g += `<line x1="${x - lapW * .4}" y1="${floorY - 8}" x2="${x - lapW * .4}" y2="${floorY - 14}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - lapW * .4}" y1="${floorY - 14}" x2="${x - lapW * .34}" y2="${floorY - 14}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // optician at the null test for live sessions — figure with a loupe
      if (r.live) {
        g += `<g class="lg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - lapW * .44} ${lapY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="6" cy="-2" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // starved lap — a dry ring around the lap on errors
      if (r.err) g += `<ellipse cx="${x}" cy="${lapY}" rx="${lapW * .32}" ry="${lapW * .1}" fill="none" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "磨镜坊", eyebrow: "PROVIDER LENSGRINDER", render };
})();
