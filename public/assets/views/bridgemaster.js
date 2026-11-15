/* ------------------------------------------------------------- bridgemaster
 * Bridgemaster view — a row of arched bridges, one per provider.
 * Arches spanning the river = tokens; a bridgemaster
 * sounding the piers for live sessions; a cracked
 * arch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bridgemaster";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="brm-empty">暂无桥务</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the river — water with ripples
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 8; w++) {
      g += `<path d="M ${w * W / 8 + 12} ${waterY + 6 + (w % 2) * 4} q 10 -3 20 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const deckY = waterY - 26;
      const stone = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      // the bridge — a multi-arched stone span
      g += `<path d="M ${x - bW * .44} ${deckY} L ${x + bW * .44} ${deckY} L ${x + bW * .4} ${waterY} L ${x - bW * .4} ${waterY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // parapet line and coping
      g += `<line x1="${x - bW * .44}" y1="${deckY - 4}" x2="${x + bW * .44}" y2="${deckY - 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .44}" y1="${deckY}" x2="${x + bW * .44}" y2="${deckY}" stroke="${r.col}" stroke-width=".6"/>`;
      // arches — 2 or 3 spans cut into the face
      const arches = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let a = 0; a < arches; a++) {
        const ax = x - bW * .3 + a * bW * .3;
        g += `<path d="M ${ax - bW * .1} ${waterY} Q ${ax} ${waterY - 14} ${ax + bW * .1} ${waterY} Z" fill="${a === 0 && r.err ? "var(--red)" : waterY ? "#587888" : "#587888"}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width=".8" opacity=".7"/>`;
      }
      // cutwaters — triangular pier noses at waterline
      for (let p = 0; p <= arches; p++) {
        const px = x - bW * .3 + p * bW * .3;
        g += `<path d="M ${px - 4} ${waterY} L ${px} ${waterY - 8} L ${px + 4} ${waterY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a lamp on the parapet
      g += `<line x1="${x + bW * .3}" y1="${deckY - 4}" x2="${x + bW * .3}" y2="${deckY - 16}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + bW * .3 - 2} ${deckY - 16} a 3 3 0 0 1 4 0 l 0 3 h -4 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a small shelter on the bridge
      g += `<rect x="${x - bW * .2}" y="${deckY - 10}" width="${bW * .18}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .22} ${deckY - 10} L ${x - bW * .11} ${deckY - 16} L ${x} ${deckY - 10} Z" fill="${r.err ? "var(--red)" : stone}" stroke="${r.col}" stroke-width=".8"/>`;
      // boats passing under the arch
      const boats = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let b = 0; b < boats; b++) {
        const bx = x - bW * .2 + b * bW * .4;
        g += `<path d="M ${bx - 10} ${waterY + 4} Q ${bx - 12} ${waterY + 9} ${bx} ${waterY + 11} Q ${bx + 12} ${waterY + 9} ${bx + 10} ${waterY + 4} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${bx}" y1="${waterY + 4}" x2="${bx}" y2="${waterY - 4}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // bridgemaster sounding for live sessions — figure on the parapet
      if (r.live) {
        g += `<g class="brm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .1} ${deckY - 18})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked arch — a fissure on the spandrel on errors
      if (r.err) g += `<path d="M ${x + bW * .15} ${waterY - 8} l -4 6 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="brm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="brm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "桥务", eyebrow: "PROVIDER BRIDGEMASTER", render };
})();
