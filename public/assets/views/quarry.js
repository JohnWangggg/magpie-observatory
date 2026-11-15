/* ------------------------------------------------------------------ quarry
 * Quarry view — a stepped open pit, one bench per provider. Bench
 * depth = recent tokens; a red vein in the face marks errors; small
 * carts trundle for live sessions.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "quarry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const surfaceY = 30;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="qr-empty">暂无采场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sky line
    g += `<line y="${surfaceY}" x2="${W}" y2="${surfaceY}" stroke="var(--line)" stroke-width="1.6"/>`;
    // soil cap
    g += `<rect y="${surfaceY - 6}" width="${W}" height="6" fill="var(--card-2)" opacity=".7"/>`;

    const pitW = (W - 60) / rows.length;
    const pitD = (H - surfaceY - 24);
    rows.forEach((r, i) => {
      const px = 30 + i * pitW;
      const benchD = 20 + (r.tok / maxTok) * (pitD - 40);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // pit face — stepped down
      g += `<path d="M ${px} ${surfaceY} L ${px + pitW * .2} ${surfaceY + benchD * .25} L ${px + pitW * .4} ${surfaceY + benchD * .5} L ${px + pitW * .6} ${surfaceY + benchD * .75} L ${px + pitW * .8} ${surfaceY + benchD} L ${px + pitW} ${surfaceY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4" stroke-linejoin="round"/>`;
      // striation lines
      for (let s = 1; s <= 4; s++) {
        const sy = surfaceY + (benchD / 5) * s;
        const sw = pitW * (.1 + (s / 5) * .6);
        g += `<line x1="${(px + pitW * .2).toFixed(0)}" y1="${sy.toFixed(0)}" x2="${(px + pitW * .2 + sw).toFixed(0)}" y2="${sy.toFixed(0)}" stroke="var(--faint)" stroke-width=".7" opacity=".4"/>`;
      }
      // red vein on errors — diagonal seam
      if (r.err) g += `<path d="M ${px + pitW * .25} ${surfaceY} L ${px + pitW * .35} ${surfaceY + benchD * .4} L ${px + pitW * .55} ${surfaceY + benchD * .7}" stroke="var(--red)" stroke-width="1.6" fill="none" opacity=".7"/>`;
      // cart on floor for live sessions
      for (let s = 0; s < Math.min(2, r.live); s++) {
        const cx = px + pitW * .55 + s * 18, cy = surfaceY + benchD * .8;
        g += `<g class="qr-cart" style="animation-delay: ${(s * .5).toFixed(1)}s">
          <rect x="${(cx - 6).toFixed(0)}" y="${(cy - 6).toFixed(0)}" width="12" height="6" rx="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="${(cx - 4).toFixed(0)}" cy="${cy.toFixed(0)}" r="1.8" fill="var(--card-2)"/>
          <circle cx="${(cx + 4).toFixed(0)}" cy="${cy.toFixed(0)}" r="1.8" fill="var(--card-2)"/>
        </g>`;
      }
      g += `<text x="${px + pitW / 2}" y="${surfaceY + benchD + 18}" text-anchor="middle" class="qr-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="qr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "采石场", eyebrow: "PROVIDER QUARRY", render };
})();
