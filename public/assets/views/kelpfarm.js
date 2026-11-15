/* ---------------------------------------------------------------- kelpfarm
 * Kelpfarm view — a row of floating rafts, one per provider. Kelp
 * fronds hanging below = tokens; a workboat alongside for live
 * sessions; a snapped buoy line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kelpfarm";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const surfaceY = H * .3;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="kf-empty">暂无藻筏</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water column
    g += `<rect y="${surfaceY}" width="${W}" height="${H - surfaceY}" fill="var(--card-2)" opacity=".35"/>`;
    for (let x = 0; x < W; x += 26) g += `<path d="M ${x} ${surfaceY + 8} q 13 -4 26 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const raftW = seg * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68c078" : "#a08858";
      // raft frame — bamboo poles
      g += `<rect x="${x - raftW / 2}" y="${surfaceY - 4}" width="${raftW}" height="6" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // buoy lines down
      const lines = 4;
      for (let l = 0; l < lines; l++) {
        const lx = x - raftW * .4 + (l / (lines - 1)) * raftW * .8;
        const len = 20 + (r.tok / maxTok) * 40;
        g += `<line x1="${lx.toFixed(0)}" y1="${surfaceY}" x2="${lx.toFixed(0)}" y2="${(surfaceY + len).toFixed(0)}" stroke="${r.err && l === 1 ? "var(--red)" : r.col}" stroke-width=".9" opacity=".7" ${r.err && l === 1 ? 'stroke-dasharray="3 2"' : ""}/>`;
        // kelp fronds — count by tokens
        const fronds = Math.min(5, Math.ceil(r.tok / maxTok * 5));
        for (let f = 0; f < fronds; f++) {
          const fy = surfaceY + 6 + f * (len / 6);
          const sway = Math.sin(f + i) * 4;
          g += `<path d="M ${lx.toFixed(0)} ${fy.toFixed(0)} q ${sway.toFixed(0)} 4 ${sway.toFixed(0)} 8" stroke="${tint}" stroke-width="1.4" fill="none" opacity=".8"/>`;
        }
      }
      // workboat alongside for live sessions
      if (r.live) {
        g += `<g class="kf-boat" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x + raftW / 2 + 4} ${surfaceY - 2} L ${x + raftW / 2 + 20} ${surfaceY - 2} L ${x + raftW / 2 + 16} ${surfaceY + 8} L ${x + raftW / 2 + 8} ${surfaceY + 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="${x + raftW / 2 + 12}" cy="${surfaceY - 5}" r="3" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x}" y="${H - 10}" text-anchor="middle" class="kf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="kf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "藻筏", eyebrow: "PROVIDER KELPFARM", render };
})();
