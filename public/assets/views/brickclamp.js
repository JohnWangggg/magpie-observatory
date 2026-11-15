/* --------------------------------------------------------------- brickclamp
 * Brickclamp view — a row of field clamps, one per provider.
 * Fired courses showing through the daub = tokens; a stoker
 * feeding the firemouths for live sessions; a slumped corner
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brickclamp";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const fieldY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bc-empty">暂无砖窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // field ground
    g += `<rect y="${fieldY}" width="${W}" height="${H - fieldY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const clampW = seg * .7;
      const clampH = 36;
      const clampTop = fieldY - clampH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c86840" : "#a84828";
      // clamp mound — trapezoid stack daubed over
      g += `<path d="M ${x - clampW / 2} ${fieldY} L ${x - clampW * .38} ${clampTop} L ${x + clampW * .38} ${clampTop} L ${x + clampW / 2} ${fieldY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // daub skin lines
      for (let c = 1; c <= 3; c++) {
        const cy = fieldY - (clampH * c / 4);
        const half = clampW / 2 - (clampW * .12 * c / 4) * 2;
        g += `<line x1="${(x - half).toFixed(0)}" y1="${cy.toFixed(0)}" x2="${(x + half).toFixed(0)}" y2="${cy.toFixed(0)}" stroke="var(--line)" stroke-width=".8" opacity=".5"/>`;
      }
      // fired brick courses glowing through — count by tokens
      const courses = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < courses; b++) {
        const by = fieldY - 8 - b * 9;
        const half = (clampW / 2 - 10) * (1 - b * .15);
        g += `<rect x="${(x - half).toFixed(0)}" y="${by.toFixed(0)}" width="${(half * 2).toFixed(0)}" height="5" fill="${tint}" opacity=".6" rx="1"/>`;
      }
      // firemouths at the foot
      for (let f = -1; f <= 1; f++) {
        g += `<path d="M ${x + f * clampW * .28 - 5} ${fieldY} v -8 a 5 5 0 0 1 10 0 v 8 Z" fill="${r.live ? tint : "var(--card-2)"}" stroke="${r.col}" stroke-width=".9"/>`;
      }
      // stoker feeding a firemouth for live sessions
      if (r.live) {
        g += `<g class="bc-stoker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + clampW / 2 + 12} ${fieldY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-14" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // slumped corner — a fallen edge on errors
      if (r.err) g += `<path d="M ${x - clampW * .4} ${fieldY - 10} l 8 4 l -4 6" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${fieldY + 18}" text-anchor="middle" class="bc-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "砖窑", eyebrow: "PROVIDER BRICKCLAMP", render };
})();
