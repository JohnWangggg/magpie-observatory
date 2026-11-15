/* ------------------------------------------------------------- harbormaster
 * Harbormaster view — a row of harbour offices, one per provider.
 * Ships berthed in the basin = tokens; a harbourmaster
 * flagging in arrivals for live sessions; a fouled
 * berth marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harbormaster";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="hmb-empty">暂无港务</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // harbour basin — water with ripple marks
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 7; w++) {
      g += `<path d="M ${w * W / 7 + 14} ${waterY + 6 + (w % 2) * 5} q 9 -3 18 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .46;
      const officeY = waterY - 24;
      const wall = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a6a" : "#4a4438";
      // the harbour office — a small building on the quay
      g += `<rect x="${x - bW * .3}" y="${officeY - 18}" width="${bW * .6}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - bW * .34} ${officeY - 18} L ${x} ${officeY - 30} L ${x + bW * .34} ${officeY - 18} Z" fill="${r.err ? "var(--red)" : wall}" stroke="${r.col}" stroke-width="1.2"/>`;
      // clock tower or flagstaff on the gable
      g += `<line x1="${x}" y1="${officeY - 30}" x2="${x}" y2="${officeY - 40}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x} ${officeY - 40} l 10 3 -10 3 z" fill="${r.err ? "var(--red)" : r.col}"/>`;
      // a door and a lamp
      g += `<rect x="${x - 4}" y="${officeY - 10}" width="8" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .22}" cy="${officeY - 8}" r="2.4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .22}" y1="${officeY - 8}" x2="${x + bW * .22}" y2="${officeY}" stroke="${r.col}" stroke-width=".8"/>`;
      // quay stones at water level
      g += `<rect x="${x - bW * .4}" y="${waterY - 4}" width="${bW * .8}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // ships berthed — hulls with masts, count by tokens
      const ships = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < ships; s++) {
        const sx = x - bW * .28 + s * bW * .28;
        const sy = waterY + 4;
        g += `<path d="M ${sx - 14} ${sy} Q ${sx - 16} ${sy + 6} ${sx} ${sy + 8} Q ${sx + 16} ${sy + 6} ${sx + 14} ${sy} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1"/>`;
        g += `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy - 18}" stroke="${r.col}" stroke-width="1.1"/>`;
        g += `<line x1="${sx - 8}" y1="${sy - 12}" x2="${sx + 8}" y2="${sy - 12}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<path d="M ${sx} ${sy - 18} q 6 -6 12 -2" fill="none" stroke="${r.col}" stroke-width=".6" opacity=".6"/>`;
      }
      // a pilot cutter rowing out — small boat if live
      if (r.live) {
        const px = x - bW * .1;
        g += `<g class="hmb-man" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${px - 8} ${waterY + 16} Q ${px - 10} ${waterY + 20} ${px} ${waterY + 22} Q ${px + 10} ${waterY + 20} ${px + 8} ${waterY + 16} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>
          <circle cx="${px}" cy="${waterY + 14}" r="2.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>
          <rect x="${px - 2.6}" y="${waterY + 16}" width="5.2" height="4" rx=".8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>
          <line x1="${px + 4}" y1="${waterY + 17}" x2="${px + 9}" y2="${waterY + 21}" stroke="${r.col}" stroke-width=".9"/>
        </g>`;
      }
      // fouled berth — a rope tangle on the quay on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${waterY - 1} q 6 3 10 0 q -4 -3 -10 0" fill="none" stroke="var(--red)" stroke-width="1.2"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="hmb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hmb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "港务", eyebrow: "PROVIDER HARBORMASTER", render };
})();
