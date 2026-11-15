/* -------------------------------------------------------------- knifegrinder
 * Knifegrinder view — a row of treadle stones, one per provider.
 * Bright edges honed off the wheel = tokens; a grinder working
 * the treadle for live sessions; a nicked blade marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "knifegrinder";
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
    if (!rows.length) { host.innerHTML = `<div class="kg-empty">暂无磨刀坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // grinding-shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8c8d0" : "#888898";
      const standW = seg * .45;
      const standY = floorY - 32;
      // the frame — a pair of legs holding the stone
      g += `<line x1="${x - standW * .28}" y1="${floorY}" x2="${x - standW * .28}" y2="${standY + 10}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + standW * .28}" y1="${floorY}" x2="${x + standW * .28}" y2="${standY + 10}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - standW * .28}" y1="${standY + 10}" x2="${x + standW * .28}" y2="${standY + 10}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the grindstone — a spinning wheel
      g += `<circle cx="${x}" cy="${standY}" r="${standW * .18}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<circle cx="${x}" cy="${standY}" r="2.5" fill="${r.col}"/>`;
      // grind marks — concentric grooves
      g += `<circle cx="${x}" cy="${standY}" r="${standW * .1}" fill="none" stroke="${r.col}" stroke-width=".7" opacity=".5" stroke-dasharray="4 3"/>`;
      // treadle — a foot bar under the stone
      g += `<line x1="${x - standW * .22}" y1="${floorY - 8}" x2="${x + standW * .22}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.4"/>`;
      // bright edges — knives hung on the frame, count by tokens
      const knives = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let k = 0; k < knives; k++) {
        const kx = x - standW * .3 + k * 8;
        g += `<path d="M ${kx} ${floorY - 8} l 8 -3 l -1 3 l -8 3 z" fill="${k === 0 && r.err ? "var(--red)" : steel}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a nick on the blade — a gap on the stone rim on errors
      if (r.err) g += `<line x1="${x + standW * .1}" y1="${standY - 4}" x2="${x + standW * .16}" y2="${standY + 4}" stroke="var(--red)" stroke-width="1.4"/>`;
      // grinder at the treadle for live sessions — figure pumping
      if (r.live) {
        g += `<g class="kg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - standW * .42} ${standY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="kg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="kg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "磨刀坊", eyebrow: "PROVIDER KNIFEGRINDER", render };
})();
