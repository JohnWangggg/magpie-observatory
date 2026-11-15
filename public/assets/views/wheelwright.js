/* ------------------------------------------------------------ wheelwright
 * Wheelwright view — a row of wagon wheels on truing stands, one
 * per provider. Spoke count = tokens; a smith fitting the iron
 * tyre for live sessions; a split rim marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wheelwright";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ww-empty">暂无轮匠坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wheelR = 24;
      const wheelY = groundY - wheelR - 6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c89858" : "#987040";
      // truing stand
      g += `<rect x="${x - 3}" y="${wheelY + wheelR}" width="6" height="${groundY - wheelY - wheelR}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // iron tyre + wooden rim
      g += `<circle cx="${x}" cy="${wheelY}" r="${wheelR}" fill="none" stroke="${r.err ? "var(--red)" : "#606878"}" stroke-width="3" ${r.err ? 'stroke-dasharray="6 3"' : ""}/>`;
      g += `<circle cx="${x}" cy="${wheelY}" r="${wheelR - 4}" fill="none" stroke="${r.col}" stroke-width="2" opacity=".7"/>`;
      // spokes — count by tokens (8-14)
      const spokes = 6 + Math.round((r.tok / maxTok) * 8);
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        const sx = x + Math.cos(a) * (wheelR - 4);
        const sy = wheelY + Math.sin(a) * (wheelR - 4);
        g += `<line x1="${x}" y1="${wheelY}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${tint}" stroke-width="1.4"/>`;
      }
      // hub
      g += `<circle cx="${x}" cy="${wheelY}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // smith fitting the iron tyre for live sessions
      if (r.live) {
        g += `<g class="ww-smith" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + wheelR + 14} ${groundY - 8})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split rim on errors
      if (r.err) g += `<path d="M ${x + wheelR * .6} ${wheelY - wheelR * .8} l 5 8 l -5 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="ww-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ww-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "轮匠坊", eyebrow: "PROVIDER WHEELWRIGHT", render };
})();
