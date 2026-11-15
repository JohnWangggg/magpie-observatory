/* ----------------------------------------------------------------- glasscone
 * Glasscone view — a row of melting cones, one per provider.
 * Parisons blown off the punty = tokens; a gaffer working the
 * marver for live sessions; a devitrified gather marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glasscone";
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
    if (!rows.length) { host.innerHTML = `<div class="gc-empty">暂无玻璃窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // glasshouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const glow = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f09040" : "#c06028";
      const coneW = seg * .5;
      const coneH = 48;
      const coneTop = floorY - coneH;
      // the cone — a bottle-shaped furnace
      g += `<path d="M ${x - coneW / 2} ${floorY} L ${x - coneW * .3} ${coneTop} L ${x + coneW * .3} ${coneTop} L ${x + coneW / 2} ${floorY} Z"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // glory hole at the foot — the working mouth, glowing
      g += `<path d="M ${x - 6} ${floorY} v -14 a 6 5 0 0 1 12 0 v 14 Z" fill="${glow}" stroke="${r.col}" stroke-width=".9" opacity=".9"/>`;
      // crown at the top — the vent
      g += `<ellipse cx="${x}" cy="${coneTop}" rx="${coneW * .18}" ry="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // parisons — blown bubbles by tokens
      const bubbles = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bubbles; b++) {
        g += `<circle cx="${x + coneW / 2 + 6 + b * 7}" cy="${floorY - 6 - (b % 2) * 4}" r="3.5" fill="none" stroke="${glow}" stroke-width="1" opacity=".9"/>`;
      }
      // gaffer at the marver for live sessions — rolling a gather
      if (r.live) {
        g += `<g class="gc-gaffer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - coneW / 2 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="16" y2="8" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="16" cy="8" r="2" fill="${glow}"/>
        </g>`;
      }
      // devitrified gather — a frosted bubble on errors
      if (r.err) g += `<circle cx="${x + coneW / 2 + 6}" cy="${floorY - 6}" r="3.5" fill="var(--red)" opacity=".5"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "玻璃窑", eyebrow: "PROVIDER GLASSCONE", render };
})();
