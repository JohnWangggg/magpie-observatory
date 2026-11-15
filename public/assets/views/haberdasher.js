/* --------------------------------------------------------------- haberdasher
 * Haberdasher view — a row of notions counters, one per provider.
 * Ribbon bolts and button cards on the shelf = tokens; a
 * haberdasher measuring ribbon for live sessions; a spilled
 * button box marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "haberdasher";
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
    if (!rows.length) { host.innerHTML = `<div class="hb-empty">暂无杂货坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ribbon = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d888b0" : "#886078";
      const cW = seg * .4;
      const cTop = floorY - 34;
      // the counter — a wooden counter with a moulded edge
      g += `<rect x="${x - cW / 2}" y="${cTop + 8}" width="${cW}" height="${floorY - cTop - 8}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - cW * .52}" y1="${cTop + 8}" x2="${x + cW * .52}" y2="${cTop + 8}" stroke="${r.col}" stroke-width="2"/>`;
      // the back shelf — a rail with ribbon bolts, count by tokens
      g += `<line x1="${x - cW / 2}" y1="${cTop - 4}" x2="${x + cW / 2}" y2="${cTop - 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      const bolts = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bolts; b++) {
        const bx = x - cW * .4 + b * cW * .24;
        g += `<rect x="${bx}" y="${cTop - 12}" width="${cW * .18}" height="8" rx="2" fill="${b === 0 && r.err ? "var(--red)" : ribbon}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${bx + cW * .09}" y1="${cTop - 12}" x2="${bx + cW * .09}" y2="${cTop - 4}" stroke="${r.col}" stroke-width=".5" opacity=".5"/>`;
      }
      // a ribbon unspooling over the counter edge
      g += `<path d="M ${x + cW * .16} ${cTop + 8} q 6 8 3 16" fill="none" stroke="${ribbon}" stroke-width="1.6"/>`;
      // button card on the counter — rows of buttons
      g += `<rect x="${x - cW * .46}" y="${cTop + 2}" width="${cW * .26}" height="14" rx="1" fill="#e0d8c8" stroke="${r.col}" stroke-width=".7"/>`;
      for (let b2 = 0; b2 < 4; b2++) {
        g += `<circle cx="${x - cW * .42 + (b2 % 2) * cW * .12}" cy="${cTop + 6 + Math.floor(b2 / 2) * 6}" r="1.8" fill="${b2 === 0 && r.err ? "var(--red)" : r.col}" opacity=".8"/>`;
      }
      // a pin cushion and scissors beside
      g += `<ellipse cx="${x + cW * .36}" cy="${cTop + 4}" rx="5" ry="3" fill="${ribbon}" stroke="${r.col}" stroke-width=".7"/>`;
      for (let p = 0; p < 3; p++) g += `<line x1="${x + cW * .33 + p * 3}" y1="${cTop + 2}" x2="${x + cW * .32 + p * 3}" y2="${cTop - 3}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + cW * .5}" cy="${cTop + 14}" r="2" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + cW * .55}" cy="${cTop + 14}" r="2" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + cW * .51}" y1="${cTop + 12}" x2="${x + cW * .56}" y2="${cTop + 4}" stroke="${r.col}" stroke-width=".8"/>`;
      // haberdasher measuring for live sessions — figure with a tape
      if (r.live) {
        g += `<g class="hb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - cW * .62} ${cTop - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="12" stroke="${r.col}" stroke-width="1" stroke-dasharray="1.5 1.2"/>
        </g>`;
      }
      // spilled button box — scattered buttons on errors
      if (r.err) {
        g += `<rect x="${x - cW * .44}" y="${floorY - 4}" width="8" height="4" fill="var(--card-2)" stroke="var(--red)" stroke-width=".8" transform="rotate(20 ${x - cW * .44} ${floorY - 4})"/>`;
        for (let d = 0; d < 3; d++) g += `<circle cx="${x - cW * .4 + d * 4}" cy="${floorY - 2}" r="1.2" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "杂货坊", eyebrow: "PROVIDER HABERDASHER", render };
})();
