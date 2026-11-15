/* ----------------------------------------------------------------- stillroom
 * Stillroom view — a row of cordial stills, one per provider.
 * Distilled drops collected in the receiver = tokens; a
 * stillmaid skimming for live sessions; a burst worm marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stillroom";
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
    if (!rows.length) { host.innerHTML = `<div class="srm-empty">暂无蒸馏坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const dew = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#78b0d0" : "#487080";
      const sW = seg * .38;
      const sTop = floorY - 40;
      // the cucurbit — a round still pot on a furnace
      g += `<rect x="${x - sW * .2}" y="${floorY - 8}" width="${sW * .4}" height="6" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x - sW * .18} ${floorY - 8} a ${sW * .18} 14 0 0 1 ${sW * .36} 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // furnace fire below
      for (let f = 0; f < 2; f++) g += `<path d="M ${x - 4 + f * 8} ${floorY - 8} q 2 -4 0 -6" fill="none" stroke="#e08030" stroke-width=".9"/>`;
      // the alembic head — a dome with a spout
      g += `<path d="M ${x - sW * .13} ${sTop + 14} a ${sW * .13} 10 0 0 1 ${sW * .26} 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - sW * .18}" y1="${floorY - 8}" x2="${x - sW * .18}" y2="${sTop + 14}" stroke="${r.col}" stroke-width="0" opacity="0"/>`;
      // neck rising to the spout
      g += `<path d="M ${x} ${sTop + 8} q 0 -8 8 -8 q 10 0 10 8" fill="none" stroke="${r.col}" stroke-width="1.3"/>`;
      // the worm — coiled condenser tube in a water tub
      g += `<rect x="${x + sW * .3}" y="${sTop + 6}" width="${sW * .24}" height="16" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x + sW * .42}" cy="${sTop + 9}" rx="${sW * .1}" ry="2.5" fill="${dew}" opacity=".5"/>`;
      for (let c = 0; c < 3; c++) {
        g += `<path d="M ${x + sW * .34} ${sTop + 10 + c * 4} q ${sW * .08} 2 ${sW * .16} 0" fill="none" stroke="${r.err && c === 1 ? "var(--red)" : r.col}" stroke-width=".9"/>`;
      }
      // spout bridge from alembic to worm
      g += `<line x1="${x + sW * .16}" y1="${sTop + 8}" x2="${x + sW * .34}" y2="${sTop + 8}" stroke="${r.col}" stroke-width="1.1"/>`;
      // the receiver — a flask catching drops below the worm
      g += `<path d="M ${x + sW * .42} ${floorY - 14} a 5 5 0 0 1 0 10" fill="none" stroke="${r.col}" stroke-width="0" opacity="0"/>`;
      g += `<path d="M ${x + sW * .38} ${floorY - 12} a 4.5 4.5 0 1 0 9 0 a 4.5 4.5 0 1 0 -9 0" fill="${dew}" opacity=".5" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + sW * .42}" y1="${sTop + 22}" x2="${x + sW * .42}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      // collected drops — dots in the receiver, count by tokens
      const drops = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let d = 0; d < drops; d++) {
        g += `<circle cx="${x + sW * .39 + (d % 2) * sW * .06}" cy="${floorY - 5 - Math.floor(d / 2) * 4}" r="1.5" fill="${d === 0 && r.err ? "var(--red)" : dew}"/>`;
      }
      // herb bundle hanging
      g += `<line x1="${x - sW * .5}" y1="${sTop - 2}" x2="${x - sW * .3}" y2="${sTop - 2}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      g += `<path d="M ${x - sW * .4} ${sTop - 2} q -2 6 0 9" fill="none" stroke="${dew}" stroke-width="1"/>`;
      // stillmaid skimming for live sessions
      if (r.live) {
        g += `<g class="srm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - sW * .44} ${sTop - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // burst worm — a leaking coil on errors
      if (r.err) g += `<path d="M ${x + sW * .42} ${sTop + 14} q 4 2 3 6" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="srm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="srm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蒸馏坊", eyebrow: "PROVIDER STILLROOM", render };
})();
