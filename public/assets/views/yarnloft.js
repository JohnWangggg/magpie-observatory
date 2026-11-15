/* ------------------------------------------------------------------ yarnloft
 * Yarnloft view — a row of clock reels, one per provider.
 * Skeins wound on the reel = tokens; a winder turning the
 * crank for live sessions; a snarled skein marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "yarnloft";
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
    if (!rows.length) { host.innerHTML = `<div class="yl-empty">暂无绞线楼</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // loft floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const yarn = r.err ? "#e06048" : r.col;
      const reelR = seg * .22;
      const cy = floorY - 30;
      // clock reel — a spoked wheel on a stand
      g += `<line x1="${x - reelR}" y1="${floorY}" x2="${x - reelR * .6}" y2="${cy}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + reelR}" y1="${floorY}" x2="${x + reelR * .6}" y2="${cy}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x}" cy="${cy}" r="${reelR}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // spokes
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g += `<line x1="${x}" y1="${cy}" x2="${x + Math.cos(a) * reelR}" y2="${cy + Math.sin(a) * reelR}" stroke="${r.col}" stroke-width=".9"/>`;
      }
      // wound yarn — a bundle of wraps on the rim, count by tokens
      const wraps = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < wraps; w++) {
        g += `<path d="M ${x - 3 + w} ${cy - reelR - 2} q 2 4 0 ${reelR * 2 + 4}" stroke="${yarn}" stroke-width="1" fill="none" opacity=".8"/>`;
      }
      // crank handle
      g += `<line x1="${x}" y1="${cy}" x2="${x + reelR * .5}" y2="${cy - reelR * .5}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x + reelR * .5}" cy="${cy - reelR * .5}" r="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // winder at the crank for live sessions
      if (r.live) {
        g += `<g class="yl-winder" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - reelR - 10} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="0" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // snarled skein — a tangled blob on errors
      if (r.err) g += `<circle cx="${x + reelR * .4}" cy="${cy + reelR * .5}" r="3" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="yl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="yl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绞线楼", eyebrow: "PROVIDER YARNLOFT", render };
})();
