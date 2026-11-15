/* ------------------------------------------------------------------ milliner
 * Milliner view — a row of hat stands, one per provider.
 * Trimmed bonnets with ribbons and plumes = tokens; a milliner
 * pinning a bow for live sessions; a torn veil marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "milliner";
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
    if (!rows.length) { host.innerHTML = `<div class="mln-empty">暂无女帽坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const silk = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0a0b8" : "#986878";
      const sW = seg * .34;
      const sTop = floorY - 44;
      // the hat stand — a turned post on a tripod foot
      g += `<line x1="${x - sW * .25}" y1="${floorY}" x2="${x}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + sW * .25}" y1="${floorY}" x2="${x}" y2="${floorY - 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x}" y1="${floorY - 8}" x2="${x}" y2="${sTop + 16}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the bonnet — crown, brim and brim binding
      g += `<path d="M ${x - sW * .24} ${sTop + 14} a ${sW * .24} 14 0 0 1 ${sW * .48} 0 l -3 6 a ${sW * .2} 10 0 0 0 -${sW * .42} 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - sW * .18} ${sTop + 12} a ${sW * .18} 11 0 0 1 ${sW * .36} 0 z" fill="${r.err ? "var(--red)" : silk}" opacity=".85" stroke="${r.col}" stroke-width=".7"/>`;
      // the ribbon — a bow at the side
      g += `<path d="M ${x + sW * .16} ${sTop + 8} q 6 -4 8 0 q -2 4 -8 0" fill="${silk}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + sW * .18} ${sTop + 10} q 4 4 3 8" fill="none" stroke="${silk}" stroke-width="1"/>`;
      // a plume — ostrich feather rising
      g += `<path d="M ${x - sW * .1} ${sTop + 6} q -4 -10 1 -16 q 2 8 5 14 z" fill="${r.err ? "var(--red)" : silk}" opacity=".8" stroke="${r.col}" stroke-width=".5"/>`;
      // trimming table — bands and flowers beside, count by tokens
      g += `<line x1="${x + sW * .6}" y1="${floorY}" x2="${x + sW * .6}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + sW * .48}" y1="${floorY - 12}" x2="${x + sW * .72}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1.1"/>`;
      const trims = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let t = 0; t < trims; t++) {
        g += `<circle cx="${x + sW * .52 + t * sW * .09}" cy="${floorY - 15}" r="2.6" fill="${t === 0 && r.err ? "var(--red)" : silk}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<circle cx="${x + sW * .52 + t * sW * .09}" cy="${floorY - 15}" r="1" fill="${r.col}"/>`;
      }
      // a bandbox on the floor
      g += `<rect x="${x - sW * .72}" y="${floorY - 8}" width="12" height="8" rx="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // milliner pinning for live sessions
      if (r.live) {
        g += `<g class="mln-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - sW * .6} ${sTop - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="12" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="14" cy="13" r=".9" fill="${silk}"/>
        </g>`;
      }
      // torn veil — a ripped net on errors
      if (r.err) g += `<path d="M ${x + sW * .05} ${sTop + 18} q 6 4 4 10" stroke="var(--red)" stroke-width="1.1" fill="none" stroke-dasharray="2 1.5"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mln-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mln-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "女帽坊", eyebrow: "PROVIDER MILLINER", render };
})();
