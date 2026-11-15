/* ---------------------------------------------------------------- sugarhouse
 * Sugarhouse view — a row of boiling pans, one per provider.
 * Strike of massecuite drawn off = tokens; a sugarman
 * skimming for live sessions; a burnt strike marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sugarhouse";
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
    if (!rows.length) { host.innerHTML = `<div class="sh-empty">暂无糖坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // boiling-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const syrup = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c88838" : "#986820";
      const panW = seg * .5;
      const panY = floorY - 14;
      // the pan — a copper kettle in a brick setting
      g += `<rect x="${x - panW / 2}" y="${panY - 6}" width="${panW}" height="16" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x}" cy="${panY - 6}" rx="${panW * .42}" ry="6" fill="${syrup}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // bubbles on the syrup — boiling by tokens
      const bubbles = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bubbles; b++) {
        g += `<circle cx="${x - panW * .2 + b * (panW * .18)}" cy="${panY - 8 - (b % 2) * 2}" r="1.4" fill="${syrup}" opacity=".9"/>`;
      }
      // drawn strike — massecuite in a mould beside
      const loaves = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let l = 0; l < loaves; l++) {
        g += `<path d="M ${x + panW / 2 + 4 + l * 9} ${floorY} l 3 -8 l 3 8 Z" fill="${syrup}" opacity=".85"/>`;
      }
      // sugarman skimming for live sessions
      if (r.live) {
        g += `<g class="sh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - panW / 2 - 8} ${panY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="3" x2="16" y2="8" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="16" cy="8" r="2" fill="${syrup}"/>
        </g>`;
      }
      // burnt strike — a black scum on errors
      if (r.err) g += `<ellipse cx="${x + panW * .15}" cy="${panY - 6}" rx="4" ry="2" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "糖坊", eyebrow: "PROVIDER SUGARHOUSE", render };
})();
