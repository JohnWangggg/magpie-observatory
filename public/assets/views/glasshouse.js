/* ------------------------------------------------------------- glasshouse
 * Glasshouse view — a row of cone-shaped furnaces, one per
 * provider. Gather on the blowpipe = tokens; a gaffer at the
 * glory hole for live sessions; a cracked pot marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glasshouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="gh-empty">暂无玻璃坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const coneW = seg * .7;
      const coneH = 52;
      const coneY = floorY - coneH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0a060" : "#c07840";
      // furnace cone — tapering stack
      g += `<path d="M ${x - coneW / 2} ${floorY} L ${x - coneW * .2} ${coneY} L ${x + coneW * .2} ${coneY} L ${x + coneW / 2} ${floorY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // glory hole — front opening
      g += `<circle cx="${x}" cy="${floorY - 14}" r="5" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      // gather on blowpipe — size by tokens
      const gatherR = 3 + (r.tok / maxTok) * 5;
      g += `<circle cx="${x}" cy="${floorY - 14}" r="${gatherR.toFixed(1)}" fill="${tint}" opacity=".7"/>`;
      // blowpipe from side
      g += `<line x1="${x - coneW * .4}" y1="${floorY - 20}" x2="${x - 8}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="1.6"/>`;
      // gaffer at glory hole for live sessions
      if (r.live) {
        g += `<g class="gh-gaffer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + coneW / 2 + 12} ${floorY - 10})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked pot inside — visible through opening
      if (r.err) g += `<path d="M ${x - 3} ${floorY - 20} L ${x + 2} ${floorY - 8} L ${x - 2} ${floorY - 2}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gh-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "玻璃坊", eyebrow: "PROVIDER GLASSHOUSE", render };
})();
