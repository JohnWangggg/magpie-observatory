/* --------------------------------------------------------------- brickclamp
 * Brickclamp view — a row of firing clamps, one per provider.
 * Fired bricks drawn from the clamp = tokens; a clampman
 * tending the fire mouths for live sessions; a scorched run
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brickclamp";
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
    if (!rows.length) { host.innerHTML = `<div class="bc-empty">暂无砖窑夹</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard ground
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b86848" : "#985038";
      const clampW = seg * .55;
      const clampH = 30 + (r.tok / maxTok) * 10;
      // the clamp — a turf-covered mound with fire mouths at the foot
      g += `<path d="M ${x - clampW / 2} ${yardY} q ${clampW * .2} -${clampH} ${clampW * .5} -${clampH} q ${clampW * .3} 0 ${clampW * .5} ${clampH} Z"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // fire mouths — arched vents along the foot
      for (let m = 0; m < 3; m++) {
        const mx = x - clampW * .3 + m * (clampW * .3);
        g += `<path d="M ${mx - 3} ${yardY} v -6 a 3 3 0 0 1 6 0 v 6 Z" fill="${m === 1 ? "var(--amber)" : "#402020"}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // fired bricks drawn — stacked beside, count by tokens
      const bricks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bricks; b++) {
        g += `<rect x="${x + clampW / 2 + 4}" y="${yardY - 6 - b * 7}" width="12" height="6" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // clampman tending for live sessions
      if (r.live) {
        g += `<g class="bc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - clampW / 2 - 8} ${yardY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // scorched run — blackened bricks on errors
      if (r.err) g += `<rect x="${x + clampW / 2 + 4}" y="${yardY - 6}" width="12" height="6" rx="1" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="bc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "砖窑夹", eyebrow: "PROVIDER BRICKCLAMP", render };
})();
