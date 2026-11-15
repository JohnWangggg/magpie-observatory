/* ---------------------------------------------------------------- signalman
 * Signalman view — a row of signal towers, one per provider.
 * Flags hoisted on the yard = tokens; a signalman hauling
 * the hoist for live sessions; a snagged flag marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "signalman";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const baseY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sgn-empty">暂无信号</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground — a headland ridge
    g += `<rect y="${baseY}" width="${W}" height="${H - baseY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 7; w++) {
      g += `<path d="M ${w * W / 7 + 14} ${baseY + 6 + (w % 2) * 5} q 9 -3 18 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .44;
      const mastY = baseY - 12;
      const flag = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a4a3a" : "#4a3a30";
      // the signal tower — a pole on a stone base
      g += `<rect x="${x - bW * .3}" y="${baseY - 8}" width="${bW * .6}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x}" y1="${mastY}" x2="${x}" y2="${mastY - 44}" stroke="${r.col}" stroke-width="1.4"/>`;
      // cross-yards — two arms with flag lines
      g += `<line x1="${x - bW * .3}" y1="${mastY - 40}" x2="${x + bW * .3}" y2="${mastY - 40}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .2}" y1="${mastY - 28}" x2="${x + bW * .2}" y2="${mastY - 28}" stroke="${r.col}" stroke-width=".8"/>`;
      // hoist lines down to a cleat
      g += `<line x1="${x - bW * .3}" y1="${mastY - 40}" x2="${x - bW * .3}" y2="${mastY - 12}" stroke="${r.col}" stroke-width=".5" opacity=".6"/>`;
      g += `<line x1="${x + bW * .3}" y1="${mastY - 40}" x2="${x + bW * .3}" y2="${mastY - 12}" stroke="${r.col}" stroke-width=".5" opacity=".6"/>`;
      g += `<rect x="${x - bW * .3}" y="${mastY - 12}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .26}" y="${mastY - 12}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // flags hoisted — small pennants on the yards, count by tokens
      const flags = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < flags; f++) {
        const fx = x - bW * .22 + f * bW * .14;
        const fy = mastY - 40 + (f % 2) * 8;
        g += `<path d="M ${fx} ${fy} l 9 3 -9 3 z" fill="${f === 0 && r.err ? "var(--red)" : flag}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a signal drum or balls on a side arm
      g += `<circle cx="${x + bW * .34}" cy="${mastY - 34}" r="2.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .34}" y1="${mastY - 34}" x2="${x + bW * .34}" y2="${mastY - 30}" stroke="${r.col}" stroke-width=".6"/>`;
      // signalman hauling for live sessions — figure at the cleat
      if (r.live) {
        g += `<g class="sgn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .42} ${mastY - 16})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="12" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snagged flag — a wrapped pennant on errors
      if (r.err) g += `<path d="M ${x + bW * .22} ${mastY - 32} q 4 4 8 0 q -4 -4 -8 0" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="sgn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sgn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "信号台", eyebrow: "PROVIDER SIGNALMAN", render };
})();
