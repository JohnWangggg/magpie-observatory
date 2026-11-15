/* --------------------------------------------------------------- poulterer
 * Poulterer view — a row of poultry yards, one per provider.
 * Eggs in the basket = tokens; a poulterer feeding
 * for live sessions; a broken egg marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "poulterer";
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
    if (!rows.length) { host.innerHTML = `<div class="pou-empty">暂无禽场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const egg = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8d8b0" : "#b09868";

      // the coop — a little house on legs
      g += `<rect x="${x - bW * .4}" y="${floorY - 22}" width="${bW * .24}" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .4} ${floorY - 22} L ${x - bW * .28} ${floorY - 30} L ${x - bW * .16} ${floorY - 22}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .28}" cy="${floorY - 16}" r="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .36}" y1="${floorY - 8}" x2="${x - bW * .36}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .2}" y1="${floorY - 8}" x2="${x - bW * .2}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      // a ramp — down to the yard
      g += `<line x1="${x - bW * .24}" y1="${floorY - 12}" x2="${x - bW * .14}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<line x1="${x - bW * .23 + s * 3}" y1="${floorY - 11 + s * 3.4}" x2="${x - bW * .2 + s * 3}" y2="${floorY - 12 + s * 3.4}" stroke="${r.col}" stroke-width=".4"/>`;
      }

      // hens — pecking birds in the yard
      for (let h = 0; h < 2; h++) {
        const hx = x - bW * .04 + h * bW * .12;
        const hy = floorY - 4;
        g += `<ellipse cx="${hx}" cy="${hy - 3}" rx="4" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<circle cx="${hx + 3}" cy="${hy - 6}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<path d="M ${hx + 4.4} ${hy - 7} l 2 -1 -1 2 z" fill="${r.err ? "var(--red)" : "#d8883a"}" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<line x1="${hx - 4}" y1="${hy - 4}" x2="${hx - 6}" y2="${hy - 6}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${hx - 1}" y1="${hy}" x2="${hx - 1}" y2="${floorY}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a rooster — on the fence
      g += `<ellipse cx="${x + bW * .34}" cy="${floorY - 16}" rx="4" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .37}" cy="${floorY - 20}" r="1.8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x + bW * .34} ${floorY - 16} q -3 -4 -4 -8 M ${x + bW * .35} ${floorY - 16} q -1 -4 -3 -7" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .34}" y1="${floorY - 13}" x2="${x + bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;

      // an egg basket — eggs piled, count by tokens
      g += `<ellipse cx="${x + bW * .14}" cy="${floorY - 4}" rx="7" ry="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x + bW * .08} ${floorY - 6} q 6 -4 12 0" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      const eggs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let e = 0; e < eggs; e++) {
        const ex = x + bW * .09 + e * 3.4;
        const ey = floorY - 6 - (e % 2) * 1.6;
        g += `<ellipse cx="${ex}" cy="${ey}" rx="1.4" ry="1.8" fill="${e === eggs - 1 && r.err ? "var(--red)" : egg}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a feed trough — with grain
      g += `<rect x="${x - bW * .02}" y="${floorY - 3}" width="${bW * .08}" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let s = 0; s < 4; s++) {
        g += `<circle cx="${x - bW * .01 + s * 2.5}" cy="${floorY - 3.5}" r=".7" fill="${egg}"/>`;
      }

      // poulterer feeding for live sessions — figure scattering
      if (r.live) {
        g += `<g class="pou-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="11" y2="1" stroke="${r.col}" stroke-width="1"/>
          <circle cx="13" cy="3" r=".8" fill="${egg}"/><circle cx="15" cy="6" r=".8" fill="${egg}"/>
        </g>`;
      }
      // broken egg — a cracked shell on errors
      if (r.err) g += `<path d="M ${x + bW * .16} ${floorY - 8} l 2 2 -2 2" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="pou-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pou-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "禽场", eyebrow: "PROVIDER POULTERER", render };
})();
