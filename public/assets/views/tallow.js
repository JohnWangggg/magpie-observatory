/* -------------------------------------------------------------------- tallow
 * Tallow view — a row of rendering pots, one per provider.
 * Fat cakes stacked = tokens; a renderer stirring the
 * pot for live sessions; a scorched pot marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tallow";
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
    if (!rows.length) { host.innerHTML = `<div class="tl-empty">暂无熬脂坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // boiling-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const fat = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0d0a8" : "#b8a878";
      const potW = seg * .38;
      const potY = floorY - 28;
      const potH = 24;
      // the pot — a cauldron on a brick hearth
      g += `<rect x="${x - potW * .34}" y="${floorY - 6}" width="${potW * .68}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - potW * .3} ${floorY - 6} L ${x - potW * .36} ${potY} L ${x + potW * .36} ${potY} L ${x + potW * .3} ${floorY - 6} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // fat surface — the melting suet
      g += `<ellipse cx="${x}" cy="${potY + 5}" rx="${potW * .3}" ry="3" fill="${fat}"/>`;
      // the fire — flames under the pot
      for (let f = 0; f < 3; f++) {
        const fx = x - 4 + f * 4;
        g += `<path d="M ${fx} ${floorY - 6} q 2 -4 0 -7" fill="none" stroke="${r.err ? "var(--red)" : "#e08030"}" stroke-width="1"/>`;
      }
      // the stirring paddle — a stick in the pot
      g += `<line x1="${x + potW * .15}" y1="${potY - 8}" x2="${x + potW * .05}" y2="${potY + 6}" stroke="${r.col}" stroke-width="1.3"/>`;
      // fat cakes — rendered tallow cakes stacked beside, count by tokens
      const cakes = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cakes; c++) {
        g += `<rect x="${x + potW * .4 + c * 5}" y="${floorY - 6 - c * 4}" width="10" height="4" rx="1" fill="${c === 0 && r.err ? "var(--red)" : fat}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // the suet basket — raw fat waiting
      g += `<ellipse cx="${x - potW * .52}" cy="${floorY - 8}" rx="5" ry="6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // steam off the pot
      g += `<path d="M ${x - 3} ${potY - 2} q 3 -6 -1 -10" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      // renderer stirring for live sessions — figure at the paddle
      if (r.live) {
        g += `<g class="tl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - potW * .46} ${potY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="13" y2="4" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // scorched pot — a burnt patch on errors
      if (r.err) g += `<ellipse cx="${x + potW * .1}" cy="${potY + 4}" rx="5" ry="2" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "熬脂坊", eyebrow: "PROVIDER TALLOW", render };
})();
