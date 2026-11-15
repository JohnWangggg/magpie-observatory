/* --------------------------------------------------------------- shipwright
 * Shipwright view — a row of building slips, one per provider.
 * Ribs raised on the stocks = tokens; a shipwright adzing
 * a futtock for live sessions; a sprung rib marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shipwright";
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
    if (!rows.length) { host.innerHTML = `<div class="shw-empty">暂无船匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the slip — a sloped ground into the water
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const keelY = floorY - 10;
      const timber = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the stocks — keel blocks on the slip
      for (let k = 0; k < 4; k++) {
        g += `<rect x="${x - bW * .3 + k * bW * .2}" y="${floorY - 8}" width="8" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // keel line
      g += `<line x1="${x - bW * .36}" y1="${keelY}" x2="${x + bW * .36}" y2="${keelY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // stem and stern posts
      g += `<line x1="${x - bW * .36}" y1="${keelY}" x2="${x - bW * .32}" y2="${keelY - 22}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .36}" y1="${keelY}" x2="${x + bW * .32}" y2="${keelY - 20}" stroke="${r.col}" stroke-width="1.2"/>`;
      // ribs — curved futtocks rising from the keel, count by tokens
      const ribs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let rb = 0; rb < ribs; rb++) {
        const rx = x - bW * .24 + rb * bW * .16;
        g += `<path d="M ${rx} ${keelY} Q ${rx - 8} ${keelY - 18} ${rx - 4} ${keelY - 30}" fill="none" stroke="${rb === 0 && r.err ? "var(--red)" : timber}" stroke-width="1.2"/>`;
        g += `<path d="M ${rx} ${keelY} Q ${rx + 8} ${keelY - 18} ${rx + 4} ${keelY - 30}" fill="none" stroke="${rb === 0 && r.err ? "var(--red)" : timber}" stroke-width="1.2"/>`;
      }
      // a ribband — a temporary batten holding the ribs
      g += `<line x1="${x - bW * .32}" y1="${keelY - 18}" x2="${x + bW * .32}" y2="${keelY - 16}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // staging — planks on trestles beside the ship
      g += `<rect x="${x - bW * .42}" y="${keelY - 20}" width="${bW * .16}" height="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .4}" y1="${keelY - 17}" x2="${x - bW * .38}" y2="${keelY - 6}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .34}" y1="${keelY - 17}" x2="${x - bW * .36}" y2="${keelY - 6}" stroke="${r.col}" stroke-width=".7"/>`;
      // a sawpit below with a saw
      g += `<rect x="${x + bW * .3}" y="${keelY - 6}" width="${bW * .12}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .32}" y1="${keelY - 6}" x2="${x + bW * .38}" y2="${keelY - 14}" stroke="${r.col}" stroke-width=".8"/>`;
      // shipwright adzing for live sessions — figure at a rib
      if (r.live) {
        g += `<g class="shw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .2} ${keelY - 40})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // sprung rib — a cracked futtock on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${keelY - 14} l -4 6 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="shw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="shw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "船匠", eyebrow: "PROVIDER SHIPWRIGHT", render };
})();
