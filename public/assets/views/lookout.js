/* ------------------------------------------------------------------ lookout
 * Lookout view — a row of shore lookouts, one per provider.
 * Sails sighted on the horizon = tokens; a lookout man
 * glassing the sea for live sessions; a torn signal
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lookout";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const seaY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lk2-empty">暂无瞭望</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the sea — horizon with faint wave marks
    g += `<rect y="${seaY}" width="${W}" height="${H - seaY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 8; w++) {
      g += `<path d="M ${w * W / 8 + 12} ${seaY + 6 + (w % 2) * 4} q 10 -3 20 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }
    g += `<line x1="0" y1="${seaY - 20}" x2="${W}" y2="${seaY - 20}" stroke="#3a4a5c" stroke-width=".6" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .44;
      const postY = seaY - 20;
      const wall = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      // the lookout — a mast or post on a headland
      g += `<rect x="${x - bW * .36}" y="${seaY - 4}" width="${bW * .72}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // post
      g += `<line x1="${x}" y1="${postY}" x2="${x}" y2="${postY - 38}" stroke="${r.col}" stroke-width="1.4"/>`;
      // platform at the top
      g += `<line x1="${x - 8}" y1="${postY - 38}" x2="${x + 8}" y2="${postY - 38}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x - 8}" y1="${postY - 34}" x2="${x + 8}" y2="${postY - 34}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - 6}" y1="${postY - 38}" x2="${x - 6}" y2="${postY - 34}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + 6}" y1="${postY - 38}" x2="${x + 6}" y2="${postY - 34}" stroke="${r.col}" stroke-width=".5"/>`;
      // a signal yard below the platform
      g += `<line x1="${x - 12}" y1="${postY - 30}" x2="${x + 12}" y2="${postY - 30}" stroke="${r.col}" stroke-width=".9"/>`;
      // sails sighted — triangle sails on the horizon, count by tokens
      const sails = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < sails; s++) {
        const sx = x - bW * .28 + s * bW * .18;
        const sy = seaY - 24;
        g += `<path d="M ${sx} ${sy - 10} L ${sx - 5} ${sy} L ${sx + 5} ${sy} Z" fill="${s === 0 && r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // a spyglass resting on the platform rail
      g += `<line x1="${x + 4}" y1="${postY - 40}" x2="${x + 14}" y2="${postY - 42}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x + 14}" cy="${postY - 42}" r="1.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a pennant on the masthead
      g += `<path d="M ${x} ${postY - 42} l 12 4 -12 4 z" fill="${r.err ? "var(--red)" : r.col}"/>`;
      // lookout glassing the sea for live sessions
      if (r.live) {
        g += `<g class="lk2-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${postY - 50})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="12" y2="2" stroke="${r.col}" stroke-width="1"/>
          <circle cx="12" cy="2" r="1.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>
        </g>`;
      }
      // torn signal — a drooping pennant on errors
      if (r.err) g += `<path d="M ${x + 12} ${postY - 30} l 0 8 -8 -4 z" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="lk2-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lk2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "瞭望塔", eyebrow: "PROVIDER LOOKOUT", render };
})();
