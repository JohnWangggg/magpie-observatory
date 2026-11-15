/* --------------------------------------------------------------- lighterman
 * Lighterman view — a row of river lighters, one per provider.
 * Casks in the hold = tokens; a lighterman poling
 * for live sessions; a swamped barge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lighterman";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .78;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lgt-empty">暂无驳船</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the river — a broad water band with ripples
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 8; w++) {
      g += `<path d="M ${w * W / 8 + 12} ${waterY + 6 + (w % 2) * 4} q 10 -3 20 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const cask = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      const bW = seg * .5;
      const hull = waterY + 2;
      // the lighter — a flat-bottomed barge hull
      g += `<path d="M ${x - bW / 2} ${hull - 8} L ${x - bW * .44} ${hull} L ${x + bW * .44} ${hull} L ${x + bW / 2} ${hull - 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // gunwale line
      g += `<line x1="${x - bW * .5}" y1="${hull - 8}" x2="${x + bW * .5}" y2="${hull - 8}" stroke="${r.col}" stroke-width="1.4"/>`;
      // waterline
      g += `<line x1="${x - bW * .5}" y1="${hull - 3}" x2="${x + bW * .5}" y2="${hull - 3}" stroke="#587888" stroke-width=".8" opacity=".6"/>`;
      // casks in the hold — barrels, count by tokens
      const casks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < casks; c++) {
        const cx = x - bW * .3 + c * bW * .18;
        g += `<ellipse cx="${cx}" cy="${hull - 11}" rx="${bW * .07}" ry="5" fill="${c === 0 && r.err ? "var(--red)" : cask}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<ellipse cx="${cx}" cy="${hull - 11}" rx="${bW * .07}" ry="1.6" fill="none" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      }
      // a tarpaulin half-covering the hold
      g += `<path d="M ${x + bW * .1} ${hull - 9} q ${bW * .15} -4 ${bW * .32} 0 l 0 2 q -${bW * .17} -3 -${bW * .32} -2 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // the sweep — a long steering oar at the stern
      g += `<line x1="${x + bW * .46}" y1="${hull - 10}" x2="${x + bW * .62}" y2="${hull + 6}" stroke="${r.col}" stroke-width="1.4"/>`;
      // the quant pole — a punt pole leaning on the bow
      g += `<line x1="${x - bW * .42}" y1="${hull - 10}" x2="${x - bW * .55}" y2="${hull - 34}" stroke="${r.col}" stroke-width="1.1"/>`;
      // a mooring rope coiled at the bow
      g += `<circle cx="${x - bW * .38}" cy="${hull - 11}" r="3" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x - bW * .38}" cy="${hull - 11}" r="1.4" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      // lighterman poling for live sessions — figure with the quant
      if (r.live) {
        g += `<g class="lgt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${hull - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="16" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // swamped barge — water over the gunwale on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${hull - 7} q ${bW * .1} 4 ${bW * .2} 0" fill="#587888" opacity=".8"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="lgt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lgt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "驳船", eyebrow: "PROVIDER LIGHTERMAN", render };
})();
