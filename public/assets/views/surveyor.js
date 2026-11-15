/* ----------------------------------------------------------------- surveyor
 * Surveyor view — a row of survey stations, one per provider.
 * Chains/stakes set out on the plot = tokens; a surveyor sighting
 * the level for live sessions; a leaning staff marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "surveyor";
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
    if (!rows.length) { host.innerHTML = `<div class="svy-empty">暂无测点</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a measured plot
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const pole = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a048" : "#806830";

      // the theodolite — a tripod with a scope
      const triX = x - bW * .18;
      g += `<line x1="${triX}" y1="${floorY - 14}" x2="${triX - 8}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${triX}" y1="${floorY - 14}" x2="${triX + 8}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${triX}" y1="${floorY - 14}" x2="${triX}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${triX - 5}" y="${floorY - 20}" width="10" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${triX + 5}" y="${floorY - 18}" width="4" height="2" fill="${pole}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<circle cx="${triX}" cy="${floorY - 22}" r="2" fill="${r.col}"/>`;
      // sight line — to the staff
      g += `<line x1="${triX + 9}" y1="${floorY - 18}" x2="${x + bW * .3}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".4" stroke-dasharray="2 2" opacity=".7"/>`;

      // the ranging staff — a striped pole, count of stakes by tokens
      g += `<line x1="${x + bW * .3}" y1="${floorY}" x2="${x + bW * .3}" y2="${floorY - 26}" stroke="${r.err ? "var(--red)" : pole}" stroke-width="1.6"/>`;
      for (let s = 0; s < 4; s++) {
        g += `<line x1="${x + bW * .3 - 1}" y1="${floorY - 5 - s * 6}" x2="${x + bW * .3 + 1}" y2="${floorY - 5 - s * 6}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a flag on the staff
      g += `<path d="M ${x + bW * .3} ${floorY - 26} l 6 2 -6 3 z" fill="${r.err ? "var(--red)" : pole}" stroke="${r.col}" stroke-width=".4"/>`;

      // ranging poles — a line of stakes, count by tokens
      const stakes = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < stakes; s++) {
        const sx = x - bW * .4 + s * bW * .12;
        const sy = floorY - 2;
        g += `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy - 12 - s * 2}" stroke="${s === stakes - 1 && r.err ? "var(--red)" : pole}" stroke-width="1.4"/>`;
        g += `<circle cx="${sx}" cy="${sy - 13 - s * 2}" r="1.2" fill="${pole}"/>`;
      }
      // a chain — between two stakes
      g += `<path d="M ${x - bW * .4} ${floorY - 4} q ${bW * .15} 6 ${bW * .3} 0" fill="none" stroke="${r.col}" stroke-width=".6" stroke-dasharray="1.5 1.5"/>`;

      // a field book — on a stand
      g += `<rect x="${x + bW * .38}" y="${floorY - 16}" width="8" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5" transform="rotate(-12 ${x + bW * .42} ${floorY - 13})"/>`;
      g += `<line x1="${x + bW * .42}" y1="${floorY - 10}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      // a measuring tape — a small reel
      g += `<circle cx="${x + bW * .42}" cy="${floorY - 4}" r="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .42}" cy="${floorY - 4}" r="1" fill="${r.col}"/>`;

      // surveyor sighting for live sessions — figure at the scope
      if (r.live) {
        g += `<g class="svy-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${triX - 12} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="4" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // leaning staff — tilted pole on errors
      if (r.err) g += `<line x1="${x + bW * .3}" y1="${floorY}" x2="${x + bW * .36}" y2="${floorY - 26}" stroke="var(--red)" stroke-width="1.4" opacity=".6"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="svy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="svy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "测绘", eyebrow: "PROVIDER SURVEYOR", render };
})();
