/* ------------------------------------------------------------------ waxhouse
 * Waxhouse view — a row of candle mould frames, one per
 * provider. Wax columns poured in the frame = tokens; a
 * candlemaker ladling for live sessions; a weeping candle
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "waxhouse";
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
    if (!rows.length) { host.innerHTML = `<div class="wx-empty">暂无蜡烛屋</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wax = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8d8b0" : "#c8b080";
      const frameTop = floorY - 48;
      const frameW = seg * .5;
      // mould frame — an A-frame holding candle tubes
      g += `<line x1="${x - frameW * .45}" y1="${floorY}" x2="${x - frameW * .35}" y2="${frameTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + frameW * .45}" y1="${floorY}" x2="${x + frameW * .35}" y2="${frameTop}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x - frameW * .38}" y1="${frameTop + 10}" x2="${x + frameW * .38}" y2="${frameTop + 10}" stroke="${r.col}" stroke-width="1.2"/>`;
      // wax columns hanging from the rail — count by tokens
      const candles = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < candles; c++) {
        const cx = x - frameW * .3 + c * (frameW * .6 / (candles - 1 || 1));
        const ch = 14 + (r.tok / maxTok) * 12;
        g += `<rect x="${cx - 2.5}" y="${frameTop + 10}" width="5" height="${ch}" rx="1.5" fill="${c === 0 && r.err ? "var(--red)" : wax}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width=".8"/>`;
        // wick at top
        g += `<line x1="${cx}" y1="${frameTop + 10}" x2="${cx}" y2="${frameTop + 6}" stroke="var(--line)" stroke-width=".8"/>`;
      }
      // candlemaker ladling for live sessions
      if (r.live) {
        g += `<g class="wx-maker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .45 - 8} ${frameTop + 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="2" x2="14" y2="6" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="14" cy="6" r="1.8" fill="${wax}"/>
        </g>`;
      }
      // weeping candle — a drip on errors
      if (r.err) g += `<circle cx="${x - frameW * .3}" cy="${frameTop + 34}" r="1.6" fill="var(--red)"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wx-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wx-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蜡烛屋", eyebrow: "PROVIDER WAXHOUSE", render };
})();
