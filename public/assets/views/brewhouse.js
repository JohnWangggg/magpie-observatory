/* ----------------------------------------------------------------- brewhouse
 * Brewhouse view — a row of open gyle tuns, one per provider.
 * Barm on the working wort = tokens; a brewer skimming the
 * head for live sessions; a stuck head marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brewhouse";
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
    if (!rows.length) { host.innerHTML = `<div class="bw-empty">暂无酿酒坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // brew-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const barm = r.err ? "#e06048" : "#e0d0a8";
      const tunW = seg * .5;
      const tunH = 38;
      const tunY = floorY - 4;
      // the gyle tun — an open square fermenter
      g += `<rect x="${x - tunW / 2}" y="${tunY - tunH}" width="${tunW}" height="${tunH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // working wort — fill depth by tokens
      const wortH = tunH * .55 + (r.tok / maxTok) * tunH * .2;
      g += `<rect x="${x - tunW / 2 + 2}" y="${(tunY - wortH).toFixed(0)}" width="${tunW - 4}" height="${wortH.toFixed(0)}" fill="#684828" opacity=".8"/>`;
      // barm — the yeast head crowning the wort, thickness by tokens
      const headH = 3 + (r.tok / maxTok) * 5;
      g += `<ellipse cx="${x}" cy="${(tunY - wortH).toFixed(0)}" rx="${tunW * .44}" ry="${headH}" fill="${r.err ? "var(--red)" : barm}" opacity=".9"/>`;
      // parachute — a wort pipe over the rim
      g += `<path d="M ${x + tunW * .3} ${tunY - tunH - 8} q 4 -2 8 0 v 8" stroke="${r.col}" stroke-width="1.4" fill="none"/>`;
      // brewer skimming the head for live sessions
      if (r.live) {
        g += `<g class="bw-brewer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - tunW / 2 - 8} ${tunY - wortH - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="3" x2="15" y2="7" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // stuck head — a hard crust on errors
      if (r.err) g += `<rect x="${x - tunW * .3}" y="${tunY - wortH - 2}" width="${tunW * .3}" height="3" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酿酒坊", eyebrow: "PROVIDER BREWHOUSE", render };
})();
