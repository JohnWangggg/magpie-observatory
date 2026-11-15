/* ----------------------------------------------------------------- thatcher
 * Thatcher view — a row of roofs being thatched, one per provider.
 * Reed bundles laid on the roof = tokens; a thatcher sparring
 * for live sessions; a slipped bundle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "thatcher";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tht-empty">暂无茅屋</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — turf
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const wallTop = floorY - 16;
      const ridge = floorY - 38;
      const straw = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b860" : "#a08040";

      // the house — walls and a window
      g += `<rect x="${x - bW * .34}" y="${wallTop}" width="${bW * .68}" height="16" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - 4}" y="${wallTop + 5}" width="8" height="7" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - 4}" y1="${wallTop + 8.5}" x2="${x + 4}" y2="${wallTop + 8.5}" stroke="${r.col}" stroke-width=".3"/>`;
      g += `<line x1="${x}" y1="${wallTop + 5}" x2="${x}" y2="${wallTop + 12}" stroke="${r.col}" stroke-width=".3"/>`;

      // the roof — a steep pitch
      g += `<path d="M ${x - bW * .4} ${wallTop} L ${x} ${ridge} L ${x + bW * .4} ${wallTop}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;

      // thatch courses — overlapping reed bands, count by tokens
      const courses = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < courses; c++) {
        const cy = wallTop - 5 - c * 5;
        const t = 1 - c * .22;
        g += `<path d="M ${x - bW * .36 * t} ${cy} L ${x} ${cy - 7 * t} L ${x + bW * .36 * t} ${cy}"
          fill="none" stroke="${c === courses - 1 && r.err ? "var(--red)" : straw}" stroke-width="3" stroke-linecap="round" opacity="${.55 + c * .12}"/>`;
      }
      // the ridge cap — a woven band on the apex
      g += `<path d="M ${x - 5} ${ridge + 2} L ${x} ${ridge - 3} L ${x + 5} ${ridge + 2}" fill="none" stroke="${straw}" stroke-width="2.5" stroke-linecap="round"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<line x1="${x - 4 + s * 4}" y1="${ridge - 1}" x2="${x - 3 + s * 4}" y2="${ridge + 2}" stroke="${r.col}" stroke-width=".4"/>`;
      }

      // a ladder — against the right slope
      g += `<line x1="${x + bW * .44}" y1="${floorY}" x2="${x + bW * .3}" y2="${wallTop - 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .48}" y1="${floorY}" x2="${x + bW * .34}" y2="${wallTop - 6}" stroke="${r.col}" stroke-width="1"/>`;
      for (let l = 0; l < 3; l++) {
        const ly = floorY - 4 - l * 6, lt = (floorY - ly) / (floorY - wallTop + 6);
        g += `<line x1="${x + bW * (.44 + .04 * lt) - 1}" y1="${ly}" x2="${x + bW * (.44 + .04 * lt) + 3.6}" y2="${ly - .6}" stroke="${r.col}" stroke-width=".6"/>`;
      }

      // reed bundles — a rick on the ground
      g += `<ellipse cx="${x - bW * .4}" cy="${floorY - 4}" rx="${bW * .08}" ry="4" fill="${straw}" stroke="${r.col}" stroke-width=".6"/>`;
      for (let d = 0; d < 3; d++) {
        g += `<line x1="${x - bW * .4 - 4 + d * 4}" y1="${floorY - 7}" x2="${x - bW * .4 - 3 + d * 4}" y2="${floorY - 1}" stroke="${r.col}" stroke-width=".3"/>`;
      }

      // thatcher sparring for live sessions — figure on the roof
      if (r.live) {
        g += `<g class="tht-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .18} ${wallTop - 22}) rotate(18)">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="10" y2="9" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // slipped bundle — a fallen wisp on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${wallTop - 14} q -6 4 -8 10" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tht-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tht-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "茅屋", eyebrow: "PROVIDER THATCHER", render };
})();
