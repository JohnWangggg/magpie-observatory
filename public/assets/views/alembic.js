/* ------------------------------------------------------------------ alembic
 * Alembic view — a row of pot stills, one per provider. Drops
 * running off the worm's beak = tokens; a stillman tending the
 * fire for live sessions; a burst worm marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "alembic";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="al-empty">暂无蒸馏釜</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stillhouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const potW = seg * .5;
      const potH = 30;
      const potY = floorY - potH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8a040" : "#a87828";
      // pot still — onion shape
      g += `<path d="M ${x - potW / 2} ${potY + potH} Q ${x - potW * .42} ${potY + 6} ${x - potW * .3} ${potY} L ${x + potW * .3} ${potY} Q ${x + potW * .42} ${potY + 6} ${x + potW / 2} ${potY + potH} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // helmet + swan neck to the worm
      g += `<path d="M ${x - 4} ${potY} L ${x - 4} ${potY - 10} Q ${x + 10} ${potY - 14} ${x + 18} ${potY - 8}" stroke="${r.col}" stroke-width="1.6" fill="none"/>`;
      // fire under the pot
      g += `<path d="M ${x - 8} ${potY + potH + 2} q 4 -6 8 0 q 4 -6 8 0" stroke="${tint}" stroke-width="1.8" fill="none" opacity=".8"/>`;
      // worm coil — turns by tokens
      const wormX = x + 24;
      const turns = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      g += `<circle cx="${wormX}" cy="${potY - 6}" r="8" fill="none" stroke="${r.err ? "var(--red)" : tint}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let t = 0; t < turns; t++) {
        g += `<path d="M ${wormX - 7 + t * 3} ${potY - 10 + t * 3} q 6 -4 8 2" stroke="${tint}" stroke-width="1" fill="none" opacity=".7"/>`;
      }
      // beak drips — count by tokens
      const beakY = potY + 4;
      g += `<line x1="${wormX + 8}" y1="${potY - 6}" x2="${wormX + 14}" y2="${beakY}" stroke="${r.col}" stroke-width="1.2"/>`;
      const drops = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < drops; d++) {
        g += `<circle cx="${wormX + 14}" cy="${beakY + 4 + d * 5}" r="1.5" fill="${tint}" opacity=".8"/>`;
      }
      // receiver under the beak
      g += `<path d="M ${wormX + 10} ${beakY + 20} l 8 0 l -2 8 l -4 0 Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // stillman tending the fire for live sessions
      if (r.live) {
        g += `<g class="al-stillman" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - potW / 2 - 10} ${floorY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="12" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst worm — a split coil on errors
      if (r.err) g += `<path d="M ${wormX - 6} ${potY - 14} l 6 4 l -6 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="al-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="al-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蒸馏釜", eyebrow: "PROVIDER ALEMBIC", render };
})();
