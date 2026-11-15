/* ------------------------------------------------------------------ coopery
 * Coopery view — a row of open casks, one per provider. Staves
 * standing in the truss = tokens; a hooper driving a hoop for
 * live sessions; a sprung stave marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "coopery";
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
    if (!rows.length) { host.innerHTML = `<div class="cy-empty">暂无箍桶铺</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b89868" : "#907850";
      const caskW = seg * .5;
      const caskH = 42;
      const caskY = floorY - 4;
      // open cask — bulged sides, top open
      g += `<path d="M ${x - caskW * .4} ${caskY - caskH} q -6 ${caskH * .5} 0 ${caskH}
             M ${x + caskW * .4} ${caskY - caskH} q 6 ${caskH * .5} 0 ${caskH}
             M ${x - caskW * .4} ${caskY - caskH} a ${caskW * .4} 5 0 0 1 ${caskW * .8} 0"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // staves — vertical lines round the cask, count by tokens
      const staves = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < staves; s++) {
        const sx = x - caskW * .32 + s * (caskW * .64 / staves);
        g += `<line x1="${sx}" y1="${caskY - caskH + 4}" x2="${sx}" y2="${caskY - 2}" stroke="${tint}" stroke-width="1.2" opacity=".8"/>`;
      }
      // hoops — two iron bands
      g += `<path d="M ${x - caskW * .38} ${caskY - caskH * .6} a ${caskW * .42} 3 0 0 0 ${caskW * .76} 0" stroke="var(--line)" stroke-width="1.6" fill="none"/>`;
      g += `<path d="M ${x - caskW * .42} ${caskY - caskH * .2} a ${caskW * .44} 3 0 0 0 ${caskW * .84} 0" stroke="var(--line)" stroke-width="1.6" fill="none"/>`;
      // hooper driving a hoop for live sessions
      if (r.live) {
        g += `<g class="cy-hooper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + caskW * .4 + 8} ${caskY - caskH * .6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // sprung stave — one stave kicked out on errors
      if (r.err) g += `<line x1="${x + caskW * .2}" y1="${caskY - caskH + 2}" x2="${x + caskW * .34}" y2="${caskY - caskH - 8}" stroke="var(--red)" stroke-width="1.6"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "箍桶铺", eyebrow: "PROVIDER COOPERY", render };
})();
