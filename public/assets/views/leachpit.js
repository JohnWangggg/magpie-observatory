/* ------------------------------------------------------------------ leachpit
 * Leachpit view — a row of ash hoppers over lye tubs, one per
 * provider. Lye running off the spout = tokens; a leachman
 * ladling ash for live sessions; a burst tub marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "leachpit";
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
    if (!rows.length) { host.innerHTML = `<div class="lp-empty">暂无淋灰坑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const hopW = seg * .5;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a89878" : "#786850";
      const hopTop = floorY - 44;
      // ash hopper — V-shaped on legs over a lye tub
      g += `<path d="M ${x - hopW / 2} ${hopTop} L ${x - 4} ${hopTop + 20} L ${x - 4} ${hopTop + 24} L ${x + 4} ${hopTop + 24} L ${x + 4} ${hopTop + 20} L ${x + hopW / 2} ${hopTop} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // straw filter at the hopper throat
      g += `<line x1="${x - 4}" y1="${hopTop + 20}" x2="${x + 4}" y2="${hopTop + 20}" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="2 1" opacity=".7"/>`;
      // ash fill inside — level by tokens
      const ashH = 4 + (r.tok / maxTok) * 14;
      g += `<path d="M ${x - hopW * .4} ${hopTop + 4} L ${x - 4} ${hopTop + 4 + ashH * .8} L ${x + 4} ${hopTop + 4 + ashH * .8} L ${x + hopW * .4} ${hopTop + 4} Z" fill="${tint}" opacity=".6"/>`;
      // lye tub under the spout
      const tubY = hopTop + 30;
      g += `<rect x="${x - 10}" y="${tubY}" width="20" height="14" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      const lyeH = 2 + (r.tok / maxTok) * 8;
      g += `<rect x="${x - 8}" y="${(tubY + 12 - lyeH).toFixed(0)}" width="16" height="${lyeH.toFixed(0)}" fill="${tint}" opacity=".6"/>`;
      // lye stream — drops by tokens
      const drops = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < drops; d++) {
        g += `<circle cx="${x}" cy="${hopTop + 26 + d * 3}" r="1.3" fill="${tint}" opacity=".85"/>`;
      }
      // leachman ladling ash for live sessions
      if (r.live) {
        g += `<g class="lp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + hopW / 2 + 10} ${hopTop - 2})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst tub — lye leaking at the tub seam on errors
      if (r.err) g += `<path d="M ${x + 10} ${tubY + 4} q 4 4 2 8" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="lp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "淋灰坑", eyebrow: "PROVIDER LEACHPIT", render };
})();
