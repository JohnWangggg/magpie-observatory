/* --------------------------------------------------------------- chainmaker
 * Chainmaker view — a row of chain forges, one per provider.
 * Links hanging on the rack = tokens; a chainmaker welding
 * a link for live sessions; a flawed link marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "chainmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="chm-empty">暂无链匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the forge floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const rackY = floorY - 24;
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#6a6a70" : "#3a3a40";
      // the forge — a hearth with a flue
      g += `<rect x="${x - bW * .42}" y="${floorY - 4}" width="${bW * .18}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .4}" y="${floorY - 22}" width="${bW * .14}" height="18" fill="${r.err ? "var(--red)" : "#5a3a2a"}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x - bW * .36} ${floorY - 8} q -4 -8 0 -12 q 4 4 0 12 M ${x - bW * .33} ${floorY - 8} q -2 -6 0 -10 q 2 4 0 10" fill="#ff9a3a" opacity=".85"/>`;
      // flue
      g += `<rect x="${x - bW * .4}" y="${floorY - 32}" width="${bW * .14}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // the anvil — a block on a stump
      g += `<rect x="${x - bW * .06}" y="${floorY - 4}" width="${bW * .16}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - bW * .02}" y="${floorY - 14}" width="${bW * .08}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // the rack — a rail above with hanging links
      g += `<line x1="${x - bW * .36}" y1="${rackY}" x2="${x + bW * .36}" y2="${rackY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .36}" y1="${rackY - 8}" x2="${x + bW * .36}" y2="${rackY - 8}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // chain links hanging — ovals, count by tokens
      const links = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let l = 0; l < links; l++) {
        const lx = x - bW * .28 + l * bW * .16;
        g += `<ellipse cx="${lx}" cy="${rackY - 10}" rx="3" ry="5" fill="none" stroke="${l === 0 && r.err ? "var(--red)" : iron}" stroke-width="1.1"/>`;
        g += `<ellipse cx="${lx}" cy="${rackY - 10}" rx="1" ry="2.4" fill="none" stroke="${l === 0 && r.err ? "var(--red)" : iron}" stroke-width=".5"/>`;
      }
      // a chain run on the floor — a coiled length
      g += `<ellipse cx="${x + bW * .2}" cy="${floorY - 4}" rx="12" ry="4" fill="none" stroke="${iron}" stroke-width=".9"/>`;
      g += `<ellipse cx="${x + bW * .2}" cy="${floorY - 4}" rx="7" ry="2.4" fill="none" stroke="${iron}" stroke-width=".5"/>`;
      // a link being welded on the anvil
      g += `<ellipse cx="${x}" cy="${floorY - 14}" rx="4" ry="6" fill="none" stroke="${r.err ? "var(--red)" : iron}" stroke-width="1.2"/>`;
      // a swage block beside
      g += `<rect x="${x + bW * .32}" y="${floorY - 8}" width="8" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .36}" cy="${floorY - 4}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // chainmaker welding for live sessions — figure at the anvil
      if (r.live) {
        g += `<g class="chm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .1} ${floorY - 28})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // flawed link — a cracked oval on errors
      if (r.err) g += `<path d="M ${x - bW * .28} ${rackY - 15} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="chm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="chm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "链匠", eyebrow: "PROVIDER CHAINMAKER", render };
})();
