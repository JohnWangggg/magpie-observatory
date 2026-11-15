/* --------------------------------------------------------------- pumpjack
 * Pumpjack view — a row of nodding donkey beam pumps, one per
 * provider. Stroke amplitude of the walking beam = tokens; a
 * roughneck watching the polish rod for live sessions; a sheared
 * gear mark marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pumpjack";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pj-empty">暂无磕头机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sandy pad
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const strokeLen = 6 + (r.tok / maxTok) * 14; // beam nod amplitude
      const pivotY = groundY - 42;
      const beamL = seg * .3; // half-beam
      const nod = Math.sin(i) * strokeLen;
      const aX = x - beamL, aY = pivotY - nod;          // horsehead end
      const bX = x + beamL, bY = pivotY + nod;          // counterweight end
      // samson post
      g += `<line x1="${x - 10}" y1="${groundY}" x2="${x}" y2="${pivotY}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x + 10}" y1="${groundY}" x2="${x}" y2="${pivotY}" stroke="${r.col}" stroke-width="2"/>`;
      // walking beam (slightly rotated by nod)
      g += `<line x1="${aX}" y1="${aY.toFixed(1)}" x2="${bX}" y2="${bY.toFixed(1)}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // horsehead + polish rod into the hole
      g += `<circle cx="${aX}" cy="${aY.toFixed(1)}" r="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${aX}" y1="${(aY + 5).toFixed(1)}" x2="${aX}" y2="${groundY}" stroke="${r.col}" stroke-width="1.2" opacity=".7"/>`;
      g += `<circle cx="${aX}" cy="${groundY}" r="3" fill="none" stroke="var(--line)" stroke-width="1"/>`;
      // counterweight arc at the back end
      g += `<path d="M ${(bX - 4).toFixed(0)} ${(bY - 2).toFixed(0)} q 8 2 6 10" stroke="${r.col}" stroke-width="1.6" fill="none" opacity=".8"/>`;
      // gearbox at the samson base
      g += `<rect x="${x - 8}" y="${groundY - 12}" width="14" height="10" rx="1.5" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="2 2"' : ""}/>`;
      // roughneck watching for live sessions
      if (r.live) {
        g += `<g class="pj-roughneck" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + beamL + 12} ${groundY - 8})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="2" x2="-10" y2="-2" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // sheared gear mark on errors
      if (r.err) g += `<path d="M ${x - 4} ${groundY - 10} l 4 -4 l -4 -4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="pj-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pj-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "磕头机", eyebrow: "PROVIDER PUMPJACK", render };
})();
