/* ---------------------------------------------------------------- triphammer
 * Triphammer view — a row of tilt hammers, one per provider.
 * Forged billets on the floor = tokens; a smith holding the
 * work for live sessions; a dropped helve marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "triphammer";
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
    if (!rows.length) { host.innerHTML = `<div class="tp-empty">暂无锤锻坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // forge floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const glow = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e89840" : "#b86830";
      const bayW = seg * .42;
      const anvilX = x + bayW * .16;
      const wheelX = x - bayW * .3;
      // the waterwheel driving the cam — a spoked wheel
      g += `<circle cx="${wheelX}" cy="${floorY - 18}" r="10" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2;
        g += `<line x1="${wheelX}" y1="${floorY - 18}" x2="${wheelX + Math.cos(a) * 10}" y2="${floorY - 18 + Math.sin(a) * 10}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // the cam — a tappet on the wheel rim lifting the helve
      g += `<rect x="${wheelX + 8}" y="${floorY - 20}" width="4" height="3" fill="${r.col}"/>`;
      // the helve — a long beam pivoted at the frame, raised on the cam
      const pivotX = x - bayW * .08;
      const tilt = r.err ? 0 : -6;
      g += `<line x1="${pivotX}" y1="${floorY - 26}" x2="${anvilX + 6}" y2="${floorY - 26 + tilt}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${pivotX}" y1="${floorY - 26}" x2="${pivotX}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the hammer head — a block on the helve end over the anvil
      g += `<rect x="${anvilX}" y="${floorY - 26 + tilt}" width="8" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the anvil — a squat block on a base
      g += `<rect x="${anvilX}" y="${floorY - 12}" width="10" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<rect x="${anvilX + 1}" y="${floorY - 6}" width="8" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // the workpiece — a glowing billet on the anvil
      g += `<rect x="${anvilX + 2}" y="${floorY - 14}" width="6" height="2" fill="${glow}"/>`;
      // forged billets — finished bars on the floor, count by tokens
      const bars = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bars; b++) {
        g += `<rect x="${x - bayW * .44 + b * 8}" y="${floorY - 4 - b}" width="10" height="2" fill="${b === 0 && r.err ? "var(--red)" : glow}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // smith holding the work for live sessions — figure with tongs
      if (r.live) {
        g += `<g class="tp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${anvilX + 16} ${floorY - 24})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="8" x2="-13" y2="11" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // dropped helve — the beam sagged on errors
      if (r.err) g += `<path d="M ${pivotX} ${floorY - 26} l ${anvilX - pivotX + 6} 6" stroke="var(--red)" stroke-width="1.8" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锤锻坊", eyebrow: "PROVIDER TRIPHAMMER", render };
})();
