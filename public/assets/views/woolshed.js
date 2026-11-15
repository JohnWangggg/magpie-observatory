/* ------------------------------------------------------------------ woolshed
 * Woolshed view — a row of shearing stands on a slatted floor,
 * one per provider. Fleece bales stacked beside the stand =
 * tokens; a shearer bent over a sheep for live sessions; a
 * dagg'd fleece marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "woolshed";
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
    if (!rows.length) { host.innerHTML = `<div class="ws-empty">暂无剪毛棚</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // slatted shed floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 14) g += `<line x1="${x}" y1="${floorY + 2}" x2="${x}" y2="${floorY + 6}" stroke="var(--line)" stroke-width="1" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const standW = seg * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8dcc8" : "#c8b898";
      // catching pen behind the stand
      g += `<rect x="${x - standW / 2}" y="${floorY - 30}" width="${standW}" height="20" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<line x1="${x - standW / 2}" y1="${floorY - 30}" x2="${x + standW / 2}" y2="${floorY - 30}" stroke="${r.col}" stroke-width="1.4"/>`;
      // bales of fleece stacked beside the stand — count by tokens
      const bales = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bales; b++) {
        g += `<rect x="${x + standW / 2 + 4}" y="${floorY - 8 - b * 9}" width="14" height="8" rx="1.5" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".9"/>`;
      }
      // shearing board in front
      g += `<rect x="${x - standW * .35}" y="${floorY - 8}" width="${standW * .5}" height="6" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // shearer bent over a sheep for live sessions
      if (r.live) {
        g += `<g class="ws-shearer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - 6} ${floorY - 14})">
          <ellipse cx="8" cy="4" rx="7" ry="4" fill="${tint}" stroke="${r.col}" stroke-width=".9"/>
          <circle cx="-2" cy="-2" r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-5" y="1" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1" transform="rotate(20 -1 4)"/>
          <line x1="0" y1="4" x2="6" y2="2" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // dagg'd fleece — a dirty clump on errors
      if (r.err) g += `<path d="M ${x - 10} ${floorY - 6} q 3 -4 6 0 q -3 5 -6 0" stroke="var(--red)" stroke-width="1.4" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ws-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ws-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "剪毛棚", eyebrow: "PROVIDER WOOLSHED", render };
})();
