/* ----------------------------------------------------------------- stevedore
 * Stevedore view — a row of wharf berths, one per provider.
 * Cargo slung onto the quay = tokens; a stevedore hooking
 * a sling for live sessions; a burst bale marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stevedore";
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
    if (!rows.length) { host.innerHTML = `<div class="sv-empty">暂无码头坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // quay wall and water strip
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<rect y="${floorY - 8}" width="${W}" height="8" fill="var(--card-3)" opacity=".6"/>`;
    for (let w = 0; w < 6; w++) g += `<path d="M ${w * W / 6 + 10} ${floorY - 4} q 8 -3 16 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".6"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const cargo = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b08848" : "#685838";
      const bW = seg * .42;
      // the derrick — a mast with a swinging boom on the quay edge
      g += `<line x1="${x - bW * .3}" y1="${floorY - 8}" x2="${x - bW * .3}" y2="${floorY - 44}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - bW * .3}" y1="${floorY - 42}" x2="${x + bW * .22}" y2="${floorY - 32}" stroke="${r.col}" stroke-width="1.4"/>`;
      // topping lift and guy
      g += `<line x1="${x - bW * .3}" y1="${floorY - 44}" x2="${x + bW * .22}" y2="${floorY - 32}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      g += `<line x1="${x - bW * .3}" y1="${floorY - 44}" x2="${x - bW * .46}" y2="${floorY - 8}" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      // the sling — cargo net with bales hanging from the boom
      const slingY = floorY - 32 + (i % 2) * 6;
      g += `<line x1="${x + bW * .22}" y1="${floorY - 32}" x2="${x + bW * .22}" y2="${slingY + 10}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x + bW * .1} ${slingY + 10} q ${bW * .12} 8 ${bW * .24} 0 l -2 -8 z" fill="${cargo}" opacity=".85" stroke="${r.col}" stroke-width=".8"/>`;
      // net mesh
      g += `<line x1="${x + bW * .13}" y1="${slingY + 6}" x2="${x + bW * .31}" y2="${slingY + 6}" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      g += `<line x1="${x + bW * .22}" y1="${slingY + 2}" x2="${x + bW * .22}" y2="${slingY + 10}" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      // landed cargo — bales stacked on the quay, count by tokens
      const bales = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bales; b++) {
        const bx = x - bW * .05 + (b % 2) * bW * .18;
        const by = floorY - 8 - Math.floor(b / 2) * 9;
        g += `<rect x="${bx}" y="${by - 8}" width="${bW * .16}" height="8" rx="1" fill="${b === 0 && r.err ? "var(--red)" : cargo}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${bx}" y1="${by - 4}" x2="${bx + bW * .16}" y2="${by - 4}" stroke="${r.col}" stroke-width=".4" opacity=".5"/>`;
      }
      // a hand-truck and a cargo hook
      g += `<line x1="${x - bW * .56}" y1="${floorY - 8}" x2="${x - bW * .5}" y2="${floorY - 18}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x - bW * .56}" cy="${floorY - 7}" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x + bW * .44} ${floorY - 12} q 3 4 0 7" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      // stevedore hooking for live sessions — figure at the sling
      if (r.live) {
        g += `<g class="sv-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .02} ${slingY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // burst bale — spilled contents on errors
      if (r.err) {
        g += `<path d="M ${x - bW * .05} ${floorY - 8} q 4 3 9 3" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
        for (let d = 0; d < 3; d++) g += `<circle cx="${x - bW * .03 + d * 4}" cy="${floorY - 4}" r="1" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sv-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "码头坊", eyebrow: "PROVIDER STEVEDORE", render };
})();
