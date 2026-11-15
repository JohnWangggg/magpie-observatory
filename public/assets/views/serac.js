/* ------------------------------------------------------------------- serac
 * Serac view — an icefall of seracs, one pinnacle per provider.
 * Height = tokens; a climbing rope dangles for live sessions; a
 * calved chunk marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "serac";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const baseY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 6);
    if (!rows.length) { host.innerHTML = `<div class="se-empty">暂无冰塔</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // icefall slope
    g += `<path d="M 0 ${baseY} L ${W} ${baseY - 30} L ${W} ${H} L 0 ${H} Z" fill="var(--card-2)" opacity=".5"/>`;
    // crevasses
    for (let c = 0; c < 8; c++) {
      const cx = (c / 8) * W + 20;
      g += `<path d="M ${cx} ${baseY - 5} L ${cx + 14} ${baseY + 10} L ${cx + 4} ${H - 10}" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const serH = 34 + (r.tok / maxTok) * 62;
      const serW = seg * .32;
      const serY = baseY - serH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#88b8e8" : "#a8c8e8";
      // serac — jagged pinnacle
      g += `<path d="M ${x - serW} ${baseY} L ${x - serW * .5} ${serY + serH * .3} L ${x - serW * .2} ${serY} L ${x + serW * .1} ${serY + serH * .15} L ${x + serW * .4} ${serY + serH * .05} L ${x + serW} ${baseY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // strata bands
      for (let s = 0; s < 3; s++) {
        const sy = serY + serH * .2 + s * serH * .25;
        g += `<path d="M ${x - serW * .8} ${sy.toFixed(0)} L ${x + serW * .8} ${(sy + 4).toFixed(0)}" stroke="${tint}" stroke-width=".8" opacity=".4"/>`;
      }
      // climbing rope for live sessions
      if (r.live) {
        g += `<g class="se-rope" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x} ${serY} q 4 12 0 20 q -4 6 0 12" stroke="${r.col}" stroke-width="1.2" fill="none"/>
          <circle cx="${x}" cy="${serY + 34}" r="3" fill="${r.col}"/>
        </g>`;
      }
      // calved chunk at base on errors
      if (r.err) g += `<rect x="${x + serW * .5}" y="${baseY - 8}" width="10" height="8" rx="2" fill="var(--red)" opacity=".5"/>`;
      g += `<text x="${x}" y="${baseY + 18}" text-anchor="middle" class="se-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="se-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰塔", eyebrow: "PROVIDER SERAC", render };
})();
