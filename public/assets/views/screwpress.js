/* --------------------------------------------------------------- screwpress
 * Screwpress view — a row of coining presses, one per provider.
 * Struck coins heaped at the anvil = tokens; a moneyer hauling
 * the weighted arm for live sessions; a clipped flan marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "screwpress";
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
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sc-empty">暂无压币机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mint floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pressW = seg * .5;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8cc60" : "#b89838";
      const postY = floorY - 48;
      // press frame — two posts + crosshead
      g += `<rect x="${x - pressW * .3}" y="${postY}" width="6" height="48" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x + pressW * .3 - 6}" y="${postY}" width="6" height="48" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - pressW * .3 - 2}" y="${postY - 8}" width="${pressW * .6 + 4}" height="10" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // screw descending from the crosshead
      g += `<line x1="${x}" y1="${postY + 2}" x2="${x}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="2.5"/>`;
      for (let s = 0; s < 6; s++) g += `<line x1="${x - 4}" y1="${postY + 6 + s * 6}" x2="${x + 4}" y2="${postY + 4 + s * 6}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      // swing arm through the screw head
      g += `<line x1="${x - pressW * .45}" y1="${postY - 2}" x2="${x + pressW * .45}" y2="${postY - 2}" stroke="${r.col}" stroke-width="2.5"/>`;
      g += `<circle cx="${x - pressW * .45}" cy="${postY - 2}" r="4" fill="${tint}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x + pressW * .45}" cy="${postY - 2}" r="4" fill="${tint}" stroke="${r.col}" stroke-width="1"/>`;
      // anvil block + die under the screw
      g += `<rect x="${x - 12}" y="${floorY - 14}" width="24" height="10" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - 7}" y="${floorY - 18}" width="14" height="4" rx="1" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // struck coins heaped beside the anvil — count by tokens
      const coins = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < coins; c++) {
        g += `<ellipse cx="${x + 16 + c * 6}" cy="${floorY - 2}" rx="4" ry="2" fill="${tint}" stroke="${r.col}" stroke-width=".7" opacity=".9"/>`;
      }
      // moneyer hauling the arm for live sessions
      if (r.live) {
        g += `<g class="sc-moneyer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pressW * .45 + 10} ${postY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-8" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // clipped flan — a bitten coin on errors
      if (r.err) g += `<path d="M ${x - 20} ${floorY - 4} a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 M ${x - 20} ${floorY - 4} l 3 -3" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sc-lab">${esc(String(r.name || "?").split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "压币机", eyebrow: "PROVIDER SCREWPRESS", render };
})();
