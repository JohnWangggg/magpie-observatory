/* -------------------------------------------------------------------- pier
 * Pier view — a row of timber dolphins (piling clusters), one per
 * provider. Pile depth = tokens; seabirds perch for live sessions;
 * a snapped pile leans for errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pier";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const seaY = H * 0.74;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pi-empty">暂无桩排</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sea
    g += `<rect y="${seaY}" width="${W}" height="${H - seaY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<path d="M ${x} ${seaY + 4} q 6 -5 12 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const depth = 20 + (r.tok / maxTok) * (seaY - 60);
      const topY = seaY - depth;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68c078" : "#e8c860";
      // cluster of 3 piles — slightly fanned
      for (let p = 0; p < 3; p++) {
        const px = x + (p - 1) * 9;
        const lean = r.err ? (p === 1 ? -8 : 0) : (p - 1) * 4;
        g += `<line x1="${px.toFixed(0)}" y1="${seaY}" x2="${(px + lean).toFixed(0)}" y2="${topY.toFixed(0)}" stroke="${r.col}" stroke-width="3" stroke-linecap="round"/>`;
      }
      // pile cap
      g += `<line x1="${(x - 12).toFixed(0)}" y1="${topY.toFixed(0)}" x2="${(x + 12).toFixed(0)}" y2="${(topY + (r.err ? -8 : 0)).toFixed(0)}" stroke="${tint}" stroke-width="2"/>`;
      // birds perched for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const bx = x - 6 + s * 8, by = topY - 4;
        g += `<g class="pi-bird" style="animation-delay: ${(s * .35).toFixed(1)}s">
          <ellipse cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" rx="3.5" ry="2" fill="${r.col}"/>
          <path d="M ${bx - 3} ${by} l -3 -2 l .8 3 z" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x}" y="${seaY + 26}" text-anchor="middle" class="pi-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pi-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "防波堤", eyebrow: "PROVIDER PIER", render };
})();
