/* -------------------------------------------------------------------- riddle
 * Riddle view — a row of sieve frames, one per provider.
 * Grain dressed through the mesh = tokens; a winnower at the
 * frame for live sessions; a torn mesh marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "riddle";
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
    if (!rows.length) { host.innerHTML = `<div class="rd-empty">暂无筛坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // granary floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const grain = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0c070" : "#b09050";
      const frameW = seg * .45;
      const frameY = floorY - 28;
      const frameH = 22;
      // the riddle — a mesh tray on legs
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="${frameW}" height="${frameH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - frameW / 2 + 4}" y1="${frameY + frameH}" x2="${x - frameW / 2 - 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + frameW / 2 - 4}" y1="${frameY + frameH}" x2="${x + frameW / 2 + 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // mesh — a cross-hatch on the tray
      for (let m = -1; m <= 1; m++) {
        g += `<line x1="${x + m * frameW * .15}" y1="${frameY + 2}" x2="${x + m * frameW * .15}" y2="${frameY + frameH - 2}" stroke="${r.err && m === 0 ? "var(--red)" : r.col}" stroke-width=".7" opacity=".6"/>`;
      }
      for (let m = 0; m < 3; m++) {
        g += `<line x1="${x - frameW / 2 + 2}" y1="${frameY + 4 + m * frameH * .28}" x2="${x + frameW / 2 - 2}" y2="${frameY + 4 + m * frameH * .28}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      }
      // dressed grain — dots falling through the mesh, count by tokens
      const grains = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < grains; d++) {
        g += `<circle cx="${x - frameW * .2 + d * frameW * .15}" cy="${frameY + frameH - 2 + d * 2}" r="1.4" fill="${grain}"/>`;
      }
      // chaff — a fine scatter below the frame
      for (let d = 0; d < 3; d++) {
        g += `<circle cx="${x + frameW * .15 + d * 6}" cy="${floorY - 4 - d * 2}" r=".9" fill="${grain}" opacity=".5"/>`;
      }
      // winnower at the frame for live sessions — figure tipping the tray
      if (r.live) {
        g += `<g class="rd-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .42} ${frameY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="15" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // torn mesh — a gap in the center line on errors
      if (r.err) g += `<path d="M ${x - 4} ${frameY + frameH / 2} l 8 0" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="rd-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "筛坊", eyebrow: "PROVIDER RIDDLE", render };
})();
