/* --------------------------------------------------------------- glassblow
 * Glassblow view — a row of glory holes at a bench, one per
 * provider. Gather bubbles on the blowpipe = tokens; a gaffer
 * marvering a gather for live sessions; a cracked parison marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glassblow";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="gb-empty">暂无玻璃吹炉</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0a040" : "#c07830";
      const gloryY = floorY - 46;
      // glory hole — an arched furnace mouth
      g += `<rect x="${x - seg * .3}" y="${gloryY - 14}" width="${seg * .6}" height="30" rx="3" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // inner fire — height by tokens
      const fireH = 6 + (r.tok / maxTok) * 14;
      g += `<path d="M ${x - seg * .25} ${gloryY + 16} L ${x - seg * .25} ${(gloryY + 16 - fireH).toFixed(0)} Q ${x} ${(gloryY + 8 - fireH).toFixed(0)} ${x + seg * .25} ${(gloryY + 16 - fireH).toFixed(0)} L ${x + seg * .25} ${gloryY + 16} Z" fill="${tint}" opacity=".5"/>`;
      // arched mouth
      g += `<path d="M ${x - seg * .22} ${gloryY + 16} q ${seg * .22} -22 ${seg * .44} 0" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // blowpipe resting across the bench — bubbles by tokens
      const pipeY = gloryY + 30;
      g += `<line x1="${x - seg * .3}" y1="${pipeY}" x2="${x + seg * .3}" y2="${pipeY}" stroke="${r.col}" stroke-width="1.6"/>`;
      const bubbles = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bubbles; b++) {
        const bx = x - seg * .15 + b * seg * .15;
        g += `<circle cx="${bx.toFixed(0)}" cy="${pipeY}" r="${(3 + b).toFixed(0)}" fill="${tint}" opacity=".65" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // marver slab beside the glory hole
      g += `<rect x="${x + seg * .32}" y="${gloryY + 8}" width="14" height="8" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // gaffer marvering a gather for live sessions
      if (r.live) {
        g += `<g class="gb-gaffer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + seg * .32 + 6} ${gloryY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="0" x2="-12" y2="8" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="-12" cy="8" r="2" fill="${tint}"/>
        </g>`;
      }
      // cracked parison — a dropped bubble on errors
      if (r.err) g += `<path d="M ${x - seg * .1} ${pipeY - 2} l 4 -8 l -4 -4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "玻璃吹炉", eyebrow: "PROVIDER GLASSBLOW", render };
})();
