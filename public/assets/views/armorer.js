/* ------------------------------------------------------------------ armorer
 * Armorer view — a row of armorers' forges, one per provider.
 * Armour pieces hung on the stand = tokens; an armorer
 * hammering for live sessions; a cracked breastplate marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "armorer";
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
    if (!rows.length) { host.innerHTML = `<div class="armor-empty">暂无甲坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — forge flagstones
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const forgeY = floorY - 12;
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#9aa8c0" : "#6a7488";

      // the forge — a hearth with coals
      g += `<rect x="${x - bW * .42}" y="${forgeY}" width="${bW * .2}" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .4}" y="${forgeY + 2}" width="${bW * .16}" height="6" fill="#ff9a3a" opacity=".7"/>`;
      g += `<circle cx="${x - bW * .36}" cy="${forgeY + 5}" r="1" fill="#ffd23a"/>`;
      g += `<circle cx="${x - bW * .3}" cy="${forgeY + 6}" r=".8" fill="#ffd23a"/>`;
      // chimney
      g += `<rect x="${x - bW * .4}" y="${forgeY - 16}" width="${bW * .16}" height="16" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .36} ${forgeY - 18} q -2 -4 2 -6" fill="none" stroke="var(--muted)" stroke-width=".6" opacity=".6"/>`;

      // the anvil — a block on a stump
      g += `<rect x="${x - bW * .06}" y="${forgeY + 4}" width="${bW * .14}" height="5" fill="${steel}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - bW * .01}" y="${forgeY + 9}" width="${bW * .08}" height="4" fill="${steel}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<ellipse cx="${x + bW * .015}" cy="${floorY - 2}" rx="${bW * .07}" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a glowing workpiece on the anvil
      g += `<rect x="${x - bW * .02}" y="${forgeY + 2.5}" width="${bW * .06}" height="2" fill="${r.err ? "var(--red)" : "#ffb050"}" stroke="${r.col}" stroke-width=".3"/>`;

      // armour stand — a post with hung pieces
      g += `<line x1="${x + bW * .3}" y1="${floorY}" x2="${x + bW * .3}" y2="${forgeY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .22}" y1="${forgeY - 30}" x2="${x + bW * .38}" y2="${forgeY - 30}" stroke="${r.col}" stroke-width="1"/>`;
      // pieces hung on the stand — count by tokens
      const pieces = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pieces; p++) {
        const px = x + bW * .24 + p * bW * .04;
        // a breastplate shape
        g += `<path d="M ${px} ${forgeY - 28} q -4 2 -4 8 l 0 4 q 4 3 8 0 l 0 -4 q 0 -6 -4 -8 z"
          fill="${p === 0 && r.err ? "var(--red)" : steel}" stroke="${r.col}" stroke-width=".5" opacity="${.6 + p * .1}"/>`;
      }
      // a helm on top
      g += `<path d="M ${x + bW * .3} ${forgeY - 34} a 4 4 0 0 1 8 0 l 0 3 l -8 0 z" fill="${steel}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .32}" y1="${forgeY - 33}" x2="${x + bW * .36}" y2="${forgeY - 33}" stroke="${r.col}" stroke-width=".4"/>`;

      // a water trough — for quenching
      g += `<rect x="${x + bW * .38}" y="${floorY - 7}" width="${bW * .14}" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .45}" cy="${floorY - 6}" rx="${bW * .06}" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;

      // armorer hammering for live sessions — figure at the anvil
      if (r.live) {
        g += `<g class="armor-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .1} ${forgeY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="10" y2="0" stroke="${r.col}" stroke-width="1"/>
          <rect x="9" y="-4" width="4" height="3" rx="1" fill="${steel}" stroke="${r.col}" stroke-width=".6"/>
        </g>`;
      }
      // cracked breastplate — a split line on errors
      if (r.err) g += `<path d="M ${x + bW * .25} ${forgeY - 26} l 3 6 -2 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="armor-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="armor-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "甲坊", eyebrow: "PROVIDER ARMORER", render };
})();
