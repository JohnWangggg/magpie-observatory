/* ----------------------------------------------------------------- barkhouse
 * Barkhouse view — a row of bark mills, one per provider.
 * Ground bark tipped into the ooze = tokens; a barker feeding
 * the mill for live sessions; a jammed wheel marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "barkhouse";
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
    if (!rows.length) { host.innerHTML = `<div class="bh-empty">暂无鞣皮坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a87848" : "#886038";
      const millY = floorY - 26;
      // edge-runner bark mill — a circular trough with a wheel
      g += `<ellipse cx="${x}" cy="${millY}" rx="${seg * .28}" ry="9" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<ellipse cx="${x}" cy="${millY - 2}" rx="${seg * .28 - 4}" ry="7" fill="var(--card-2)" opacity=".9"/>`;
      // the wheel on its axle
      g += `<line x1="${x}" y1="${millY - 26}" x2="${x}" y2="${millY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<circle cx="${x}" cy="${millY - 8}" r="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x}" cy="${millY - 8}" r="2" fill="${tint}"/>`;
      // ooze pit beside the mill — a sunken vat
      g += `<rect x="${x + seg * .32}" y="${floorY - 12}" width="${seg * .18}" height="12" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x + seg * .32 + 2}" y="${floorY - 10}" width="${seg * .18 - 4}" height="4" fill="#684838" opacity=".7"/>`;
      // ground bark tipped in — mounds by tokens
      const mounds = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < mounds; m++) {
        g += `<path d="M ${x + seg * .34 + m * 6} ${floorY - 10} q 3 -4 5 0" fill="${tint}" opacity=".85"/>`;
      }
      // barker feeding the mill for live sessions
      if (r.live) {
        g += `<g class="bh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // jammed wheel — a wedge under the rim on errors
      if (r.err) g += `<path d="M ${x + seg * .2} ${millY - 2} l 6 -4 l -2 6 Z" fill="var(--red)"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞣皮坊", eyebrow: "PROVIDER BARKHOUSE", render };
})();
