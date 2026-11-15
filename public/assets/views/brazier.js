/* ------------------------------------------------------------------ brazier
 * Brazier view — a row of braziers' hearths, one per provider.
 * Copperware hung by the hearth = tokens; a brazier soldering
 * for live sessions; a holed pan marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brazier";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="braz-empty">暂无铜坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — forge flags
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const hearthY = floorY - 14;
      const copper = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d88858" : "#a05838";

      // the hearth — a brick box with coals
      g += `<rect x="${x - bW * .4}" y="${hearthY}" width="${bW * .26}" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .37}" y="${hearthY + 3}" width="${bW * .2}" height="6" fill="#ff8a3a" opacity=".75"/>`;
      g += `<circle cx="${x - bW * .32}" cy="${hearthY + 5}" r="1" fill="#ffd23a"/>`;
      g += `<circle cx="${x - bW * .24}" cy="${hearthY + 6}" r=".8" fill="#ffd23a"/>`;
      // hood and flue
      g += `<path d="M ${x - bW * .4} ${hearthY} l ${bW * .1} -10 ${bW * .06} 0 l ${bW * .1} 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x - bW * .3}" y="${hearthY - 22}" width="${bW * .06}" height="12" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;

      // a kettle over the fire — on a trivet
      g += `<path d="M ${x - bW * .34} ${hearthY - 6} a 7 5 0 0 0 14 0 l -2 -4 h -10 z" fill="${copper}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .34} ${hearthY - 9} q 7 -6 14 0" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      // steam
      g += `<path d="M ${x - bW * .28} ${hearthY - 14} q -2 -4 0 -7" fill="none" stroke="var(--muted)" stroke-width=".6" opacity=".7"/>`;

      // a solder bench — beside the hearth
      g += `<rect x="${x - bW * .04}" y="${hearthY + 4}" width="${bW * .2}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x}" y="${hearthY + 9}" width="4" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .12}" y="${hearthY + 9}" width="4" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // a pan on the bench being mended
      g += `<ellipse cx="${x + bW * .06}" cy="${hearthY + 4}" rx="${bW * .06}" ry="3" fill="${copper}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .03}" y1="${hearthY + 2}" x2="${x + bW * .09}" y2="${hearthY + 2}" stroke="${r.col}" stroke-width=".3"/>`;

      // copperware rail — hung pans, count by tokens
      g += `<line x1="${x + bW * .2}" y1="${hearthY - 24}" x2="${x + bW * .2}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .44}" y1="${hearthY - 24}" x2="${x + bW * .44}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .16}" y1="${hearthY - 24}" x2="${x + bW * .48}" y2="${hearthY - 24}" stroke="${r.col}" stroke-width="1"/>`;
      const wares = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let w = 0; w < wares; w++) {
        const wx = x + bW * .21 + w * bW * .08;
        // a hung pan — body + handle
        g += `<ellipse cx="${wx + 3}" cy="${hearthY - 14}" rx="4" ry="5" fill="${w === 0 && r.err ? "var(--red)" : copper}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${wx + 3}" y1="${hearthY - 19}" x2="${wx + 3}" y2="${hearthY - 24}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<ellipse cx="${wx + 3}" cy="${hearthY - 15}" rx="2.5" ry="3" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // brazier soldering for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="braz-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .02} ${hearthY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="10" y2="13" stroke="${r.col}" stroke-width="1"/>
          <circle cx="11" cy="14" r="1.2" fill="#ffd23a"/>
        </g>`;
      }
      // holed pan — a leak dot on errors
      if (r.err) g += `<circle cx="${x + bW * .24}" cy="${hearthY - 14}" r="1.4" fill="var(--red)"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="braz-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="braz-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铜坊", eyebrow: "PROVIDER BRAZIER", render };
})();
