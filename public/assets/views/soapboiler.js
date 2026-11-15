/* -------------------------------------------------------------- soapboiler
 * Soapboiler view — a row of soap houses, one per provider.
 * Soap blocks curing on the rack = tokens; a soapboiler stirring
 * the copper for live sessions; a split bar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "soapboiler";
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
    if (!rows.length) { host.innerHTML = `<div class="sob-empty">暂无皂坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — stone flags
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const potY = floorY - 16;
      const soap = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8d8b0" : "#789878";

      // the copper — a big pot on a brick base
      g += `<rect x="${x - bW * .38}" y="${potY + 6}" width="${bW * .26}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .36} ${potY + 6} a ${bW * .11} 9 0 0 0 ${bW * .22} 0 l -2 -7 h -${bW * .18} z" fill="${soap}" stroke="${r.col}" stroke-width=".8"/>`;
      // fire under the pot
      g += `<path d="M ${x - bW * .3} ${floorY - 4} q -3 -6 0 -9 q 3 3 0 9 M ${x - bW * .22} ${floorY - 4} q -2 -4 0 -7 q 2 3 0 7" fill="#ff9a3a" opacity=".85"/>`;
      // bubbles — simmering liquor
      for (let b = 0; b < 3; b++) {
        g += `<circle cx="${x - bW * .3 + b * bW * .07}" cy="${potY - 1}" r="1.2" fill="none" stroke="${r.col}" stroke-width=".4" opacity=".7"/>`;
      }
      // steam
      g += `<path d="M ${x - bW * .28} ${potY - 8} q -2 -4 0 -7" fill="none" stroke="var(--muted)" stroke-width=".6" opacity=".7"/>`;
      // a paddle — leaning in
      g += `<line x1="${x - bW * .14}" y1="${potY - 4}" x2="${x - bW * .1}" y2="${potY - 16}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .12}" y="${potY - 20}" width="4" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // a curing rack — shelves of soap blocks, count by tokens
      g += `<line x1="${x + bW * .1}" y1="${floorY}" x2="${x + bW * .1}" y2="${potY - 28}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .44}" y1="${floorY}" x2="${x + bW * .44}" y2="${potY - 28}" stroke="${r.col}" stroke-width="1"/>`;
      for (let s = 0; s < 2; s++) {
        g += `<line x1="${x + bW * .06}" y1="${potY - 26 + s * 10}" x2="${x + bW * .48}" y2="${potY - 26 + s * 10}" stroke="${r.col}" stroke-width="1"/>`;
      }
      const bars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bars; b++) {
        const bx = x + bW * .1 + (b % 2) * bW * .16;
        const by = potY - 29 - Math.floor(b / 2) * 10 + (Math.floor(b / 2) ? 0 : 0);
        const row = b < 2 ? potY - 29 : potY - 19;
        const col = b % 2 ? x + bW * .26 : x + bW * .12;
        g += `<rect x="${col}" y="${row}" width="${bW * .12}" height="5" rx="1" fill="${b === 0 && r.err ? "var(--red)" : soap}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${col + 2}" y1="${row + 2.5}" x2="${col + bW * .12 - 2}" y2="${row + 2.5}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // a fat barrel — beside the copper
      g += `<path d="M ${x + bW * .46} ${floorY} l -3 -12 h 10 l -3 12 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .48}" cy="${floorY - 12}" rx="5" ry="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      // an ash hopper — for lye
      g += `<path d="M ${x - bW * .44} ${floorY} l 0 -8 l 8 -4 l 0 12 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .4}" y1="${floorY - 4}" x2="${x - bW * .38}" y2="${floorY}" stroke="${r.col}" stroke-width=".4"/>`;

      // soapboiler stirring for live sessions — figure at the copper
      if (r.live) {
        g += `<g class="sob-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${potY - 22})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="-6" y2="14" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="7" x2="-10" y2="13" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split bar — a cracked soap on errors
      if (r.err) g += `<path d="M ${x + bW * .14} ${potY - 29} l 3 5 -3 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="sob-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sob-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "皂坊", eyebrow: "PROVIDER SOAPBOILER", render };
})();
