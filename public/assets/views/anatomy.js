/* ------------------------------------------------------------------ anatomy
 * Anatomy view — a candle-lit anatomy theatre, one tiered bench
 * per provider. Candle glow on the specimen table = tokens; a
 * demonstrator's pointer for live sessions; a cracked rib marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "anatomy";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;
    const cx = W / 2, cy = floorY - 30;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="an-empty">暂无解剖剧场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    // concentric benches — one per provider
    rows.forEach((r, i) => {
      const rr = 30 + i * 18;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // bench arc
      g += `<path d="M ${cx - rr} ${cy} A ${rr} ${rr * .6} 0 0 1 ${cx + rr} ${cy}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" opacity=".7"/>`;
      g += `<path d="M ${cx - rr} ${cy} A ${rr} ${rr * .6} 0 0 1 ${cx + rr} ${cy} L ${cx + rr} ${cy + 6} A ${rr} ${rr * .6} 0 0 0 ${cx - rr} ${cy + 6} Z" fill="var(--card-3)" opacity=".5"/>`;
      // candle on bench — glow by tokens
      const candleX = cx + rr * .5, candleY = cy - rr * .3;
      g += `<line x1="${candleX.toFixed(0)}" y1="${candleY.toFixed(0)}" x2="${candleX.toFixed(0)}" y2="${(candleY - 8).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
      const flameH = 3 + (r.tok / maxTok) * 6;
      g += `<ellipse class="an-flame" style="animation-delay: ${(i * .3).toFixed(1)}s" cx="${candleX.toFixed(0)}" cy="${(candleY - 10 - flameH / 2).toFixed(0)}" rx="2" ry="${(flameH / 2).toFixed(1)}" fill="${tint}" opacity=".85"/>`;
      // demonstrator pointer for live sessions
      if (r.live) {
        g += `<line x1="${(cx - rr * .6).toFixed(0)}" y1="${(cy - rr * .4).toFixed(0)}" x2="${(cx - rr * .2).toFixed(0)}" y2="${(cy - 8).toFixed(0)}" stroke="${r.col}" stroke-width="1.4"/>`;
        g += `<circle cx="${(cx - rr * .6).toFixed(0)}" cy="${(cy - rr * .4).toFixed(0)}" r="3" fill="${r.col}" opacity=".8"/>`;
      }
      // cracked rib on specimen table for errors
      if (r.err) g += `<path d="M ${cx - 6} ${cy - 2} L ${cx + 5} ${cy + 3} L ${cx - 3} ${cy + 7}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${(cx + rr * .75).toFixed(0)}" y="${(cy - rr * .15).toFixed(0)}" class="an-lab">${esc(r.name.split("/").pop().slice(0, 7))}</text>`;
    });
    // specimen table at centre
    g += `<rect x="${cx - 16}" y="${cy - 4}" width="32" height="8" rx="1.5" fill="var(--card-3)" stroke="var(--line)" stroke-width="1"/>`;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="10" ry="4" fill="var(--card-2)" opacity=".8"/>`;
    g += `<path d="M ${cx - 6} ${cy} q 6 -4 12 0" stroke="var(--line)" stroke-width="1" fill="none"/>`;

    host.innerHTML = `<svg class="an-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "解剖剧场", eyebrow: "PROVIDER ANATOMY", render };
})();
