/* ---------------------------------------------------------------- topiary
 * Topiary view — a formal garden of clipped shrubs, one per provider.
 * Shrub height and spread scale with recent token volume; live
 * sessions are birds perched on the crowns; a brown patch marks a
 * provider running errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "topiary";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * 0.84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);

    if (!rows.length) { host.innerHTML = `<div class="ty-empty">暂无园圃</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // hedge line + lawn
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 12) g += `<path d="M ${x} ${groundY + 5} q 3 -8 6 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;
    // ball finial posts between shrubs
    const seg = W / (rows.length + 1);
    for (let i = 0; i <= rows.length; i++) {
      const px = seg * (i + .5);
      g += `<line x1="${px}" y1="${groundY}" x2="${px}" y2="${groundY - 26}" stroke="var(--line)" stroke-width="1.4"/>`;
      g += `<circle cx="${px}" cy="${groundY - 30}" r="7" fill="var(--card-3)" stroke="var(--line)" stroke-width="1.2"/>`;
    }

    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const shrubH = 30 + (r.tok / maxTok) * (groundY - 90);
      const shrubW = 34 + (r.tok / maxTok) * 30;
      const crownY = groundY - shrubH;
      const col = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#a09050";
      // trunk
      g += `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${crownY + 8}" stroke="${r.col}" stroke-width="2.4"/>`;
      // crown — clipped sphere
      g += `<circle cx="${x}" cy="${(crownY - shrubW * .2).toFixed(0)}" r="${(shrubW * .55).toFixed(0)}" fill="var(--card-3)" stroke="${col}" stroke-width="1.6"/>`;
      // inner clipping marks — curved shears
      for (let m = 0; m < 3; m++) {
        const my = crownY - shrubW * .2 - 8 + m * 8;
        g += `<path d="M ${(x - shrubW * .4).toFixed(0)} ${my} q ${(shrubW * .4).toFixed(0)} -6 ${(shrubW * .8).toFixed(0)} 0" stroke="${col}" stroke-width=".8" fill="none" opacity=".5"/>`;
      }
      // birds — small dots with tails for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const bx = x + (s - 1) * (shrubW * .3), by = crownY - shrubW * .55 - 6;
        g += `<g class="ty-bird" style="animation-delay: ${(s * .3).toFixed(1)}s">
          <ellipse cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" rx="4" ry="2.5" fill="${r.col}"/>
          <path d="M ${bx - 4} ${by} l -4 -3 l 1 4 z" fill="${r.col}"/>
        </g>`;
      }
      // brown patch on errors
      if (r.err) {
        const px = x + shrubW * .25, py = crownY - shrubW * .15;
        g += `<ellipse cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" rx="${(shrubW * .2).toFixed(0)}" ry="${(shrubW * .12).toFixed(0)}" fill="var(--red)" opacity=".6"/>`;
      }
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="ty-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ty-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "修剪园", eyebrow: "PROVIDER TOPIARY", render };
})();
