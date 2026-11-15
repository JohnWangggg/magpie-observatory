/* -------------------------------------------------------------- tollkeeper
 * Tollkeeper view — a row of toll gates, one per provider.
 * Carts queued at the gate = tokens; a keeper lifting
 * the bar for live sessions; a jammed bar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tollkeeper";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const roadY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tlk-empty">暂无收费</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the road — a dirt strip with a centre line
    g += `<rect y="${roadY}" width="${W}" height="${H - roadY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${roadY + 4}" x2="${W}" y2="${roadY + 4}" stroke="var(--line)" stroke-width=".8" stroke-dasharray="6 4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .44;
      const boothY = roadY - 14;
      const wall = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      // the toll booth — a small hut beside the road
      g += `<rect x="${x - bW * .36}" y="${boothY - 18}" width="${bW * .3}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - bW * .4} ${boothY - 18} L ${x - bW * .21} ${boothY - 28} L ${x - bW * .02} ${boothY - 18} Z" fill="${r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - bW * .28}" y="${boothY - 12}" width="${bW * .14}" height="7" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      // the gate bar — pivoted at a post
      g += `<rect x="${x + bW * .24}" y="${roadY - 6}" width="5" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .24}" y1="${roadY - 6}" x2="${x + bW * .44}" y2="${roadY - 16}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // counterweight on the bar
      g += `<circle cx="${x + bW * .44}" cy="${roadY - 16}" r="2.6" fill="${r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".7"/>`;
      // carts queued — small wagons on the road, count by tokens
      const carts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < carts; c++) {
        const cx = x - bW * .3 + c * bW * .18;
        const cy = roadY + 2;
        g += `<rect x="${cx - 9}" y="${cy - 8}" width="18" height="8" rx="1" fill="${c === 0 && r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<circle cx="${cx - 5}" cy="${cy}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<circle cx="${cx + 5}" cy="${cy}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
        // a load on the cart
        g += `<rect x="${cx - 5}" y="${cy - 12}" width="10" height="4" fill="${c === 0 && r.err ? "var(--red)" : "#a08048"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a toll board with rates
      g += `<rect x="${x + bW * .04}" y="${boothY - 14}" width="${bW * .16}" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .06}" y1="${boothY - 12}" x2="${x + bW * .18}" y2="${boothY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .06}" y1="${boothY - 9}" x2="${x + bW * .16}" y2="${boothY - 9}" stroke="${r.col}" stroke-width=".4"/>`;
      // a handbell hanging at the booth
      g += `<path d="M ${x - bW * .02} ${boothY - 12} a 2.4 2.4 0 0 1 4.8 0 l 0 3 h -4.8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // keeper lifting for live sessions — figure at the gate
      if (r.live) {
        g += `<g class="tlk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .34} ${roadY - 16})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="4" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // jammed bar — a dropped bar across the road on errors
      if (r.err) g += `<line x1="${x + bW * .24}" y1="${roadY - 6}" x2="${x + bW * .44}" y2="${roadY + 2}" stroke="var(--red)" stroke-width="1.6"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tlk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tlk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "收费桥", eyebrow: "PROVIDER TOLLKEEPER", render };
})();
