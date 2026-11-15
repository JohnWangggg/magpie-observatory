/* -------------------------------------------------------------------- mews
 * Mews view — a row of weathering blocks, one per provider. Hooded
 * falcon on the block = tokens; a bating bird for live sessions;
 * an empty block with loose jess marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mews";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const gravelY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mw-empty">暂无鹰房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // gravel floor
    g += `<rect y="${gravelY}" width="${W}" height="${H - gravelY}" fill="var(--card-2)"/>`;
    for (let x = 6; x < W; x += 16) g += `<circle cx="${x}" cy="${gravelY + 6}" r="1.5" fill="var(--line)" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const blockW = seg * .5;
      const blockH = 18;
      const blockY = gravelY - blockH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a8b8c8" : "#788898";
      // weathering block — stone pedestal
      g += `<rect x="${x - blockW / 2}" y="${blockY}" width="${blockW}" height="${blockH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // falcon — perched on block, size by tokens
      const birdR = 4 + (r.tok / maxTok) * 4;
      const birdY = blockY - birdR - 2;
      // hooded — blindfolded head
      g += `<circle cx="${x}" cy="${birdY}" r="${birdR.toFixed(1)}" fill="${tint}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - birdR * .6} ${birdY - 1} q ${birdR * .6} -3 ${birdR * 1.2} 0" stroke="var(--bg)" stroke-width="1.4" fill="none"/>`;
      // jesses — leather straps hanging
      g += `<line x1="${x - 2}" y1="${birdY + birdR}" x2="${x - 2}" y2="${blockY - 1}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + 2}" y1="${birdY + birdR}" x2="${x + 2}" y2="${blockY - 1}" stroke="${r.col}" stroke-width="1"/>`;
      // bating — wings spread for live sessions
      if (r.live) {
        g += `<g class="mw-bate" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${birdY})">
          <path d="M ${-birdR - 6} 0 q -6 -8 -4 -14 M ${birdR + 6} 0 q 6 -8 4 -14" stroke="${r.col}" stroke-width="1.4" fill="none"/>
        </g>`;
      }
      // loose jess on errors — dangling broken strap
      if (r.err) g += `<path d="M ${x + blockW / 2 + 4} ${blockY + 4} q 4 6 0 12" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${gravelY + 18}" text-anchor="middle" class="mw-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鹰房", eyebrow: "PROVIDER MEWS", render };
})();
