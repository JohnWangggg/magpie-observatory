/* ----------------------------------------------------------------- lacemaker
 * Lacemaker view — a row of lace pillows, one per provider.
 * Lace edging unrolled on the frame = tokens; a lacemaker
 * crossing bobbins for live sessions; a snagged thread marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lacemaker";
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
    if (!rows.length) { host.innerHTML = `<div class="lc-empty">暂无蕾丝坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const thread = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0ecdc" : "#b8b098";
      const pW = seg * .38;
      const pTop = floorY - 24;
      // the lace pillow — a rounded bolster on a stand
      g += `<line x1="${x - pW * .3}" y1="${floorY}" x2="${x - pW * .24}" y2="${pTop + 10}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + pW * .3}" y1="${floorY}" x2="${x + pW * .24}" y2="${pTop + 10}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<ellipse cx="${x}" cy="${pTop}" rx="${pW * .46}" ry="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // the pinned pattern — a pricking card on the pillow
      g += `<path d="M ${x - pW * .3} ${pTop - 8} q ${pW * .3} -8 ${pW * .6} 0 l 0 4 q -${pW * .3} -6 -${pW * .6} 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // pins standing on the pattern
      for (let pn = 0; pn < 4; pn++) {
        g += `<line x1="${x - pW * .22 + pn * pW * .15}" y1="${pTop - 9}" x2="${x - pW * .22 + pn * pW * .15}" y2="${pTop - 13}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<circle cx="${x - pW * .22 + pn * pW * .15}" cy="${pTop - 14}" r="1" fill="${pn === 0 && r.err ? "var(--red)" : r.col}"/>`;
      }
      // hanging bobbins — weighted spangles dangling in a fan
      for (let bb = 0; bb < 5; bb++) {
        const bx = x - pW * .36 + bb * pW * .18;
        g += `<line x1="${x}" y1="${pTop + 8}" x2="${bx}" y2="${floorY - 4}" stroke="${bb === 0 && r.err ? "var(--red)" : thread}" stroke-width=".8"/>`;
        g += `<ellipse cx="${bx}" cy="${floorY - 4}" rx="2" ry="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // finished lace edging — a length unrolled on a frame beside
      g += `<line x1="${x + pW * .52}" y1="${floorY}" x2="${x + pW * .52}" y2="${pTop - 16}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + pW * .44}" y1="${pTop - 12}" x2="${x + pW * .64}" y2="${pTop - 12}" stroke="${r.col}" stroke-width="1"/>`;
      const lace = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < lace; l++) {
        g += `<path d="M ${x + pW * .46 + l * pW * .07} ${pTop - 10} q 2 6 -1 12" fill="none" stroke="${l === 0 && r.err ? "var(--red)" : thread}" stroke-width="1.1" stroke-dasharray="2 1.4"/>`;
      }
      // lacemaker crossing bobbins for live sessions
      if (r.live) {
        g += `<g class="lc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pW * .56} ${pTop - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="11" y2="12" stroke="${r.col}" stroke-width="1"/>
          <line x1="5" y1="8" x2="13" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snagged thread — a looped break on errors
      if (r.err) g += `<path d="M ${x + pW * .1} ${pTop - 6} q 6 -3 4 4" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蕾丝坊", eyebrow: "PROVIDER LACEMAKER", render };
})();
