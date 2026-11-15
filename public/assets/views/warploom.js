/* ------------------------------------------------------------------- warploom
 * Warploom view — a row of warp-weighted looms, one per provider.
 * Cloth woven down the shed = tokens; a weaver passing the
 * shuttle for live sessions; a broken warp marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "warploom";
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
    if (!rows.length) { host.innerHTML = `<div class="wl-empty">暂无立织机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // weaving-shed floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const thread = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c090" : "#a89070";
      const loomW = seg * .45;
      const loomTop = floorY - 40;
      // the frame — two uprights and a breastbeam
      g += `<line x1="${x - loomW * .3}" y1="${floorY}" x2="${x - loomW * .3}" y2="${loomTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + loomW * .3}" y1="${floorY}" x2="${x + loomW * .3}" y2="${loomTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - loomW * .34}" y1="${loomTop}" x2="${x + loomW * .34}" y2="${loomTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      // warp threads — hanging from the beam, count by tokens
      const warps = Math.min(5, 2 + Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < warps; w++) {
        const wx = x - loomW * .22 + w * (loomW * .44 / warps);
        g += `<line x1="${wx}" y1="${loomTop}" x2="${wx}" y2="${loomTop + 18 + (w % 2) * 4}" stroke="${w === 0 && r.err ? "var(--red)" : thread}" stroke-width="1"/>`;
        // loom weights — the stones keeping tension
        g += `<circle cx="${wx}" cy="${loomTop + 21 + (w % 2) * 4}" r="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // the shed — a heddle bar parting the warps
      g += `<line x1="${x - loomW * .26}" y1="${loomTop + 10}" x2="${x + loomW * .26}" y2="${loomTop + 10}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // woven cloth — a growing band below the heddle, rows by tokens
      const cloth = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cloth; c++) {
        g += `<line x1="${x - loomW * .22}" y1="${loomTop + 14 + c * 3}" x2="${x + loomW * .22}" y2="${loomTop + 14 + c * 3}" stroke="${thread}" stroke-width="1.2" opacity="${.9 - c * .08}"/>`;
      }
      // the shuttle — a small boat mid-shed
      g += `<ellipse cx="${x + loomW * .05}" cy="${loomTop + 10}" rx="4" ry="2" fill="${thread}" stroke="${r.col}" stroke-width=".7"/>`;
      // weaver passing the shuttle for live sessions — figure at the frame
      if (r.live) {
        g += `<g class="wl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - loomW * .44} ${loomTop - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="15" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // broken warp — a slack thread on errors
      if (r.err) g += `<path d="M ${x - loomW * .14} ${loomTop + 14} q 4 8 8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "立织机", eyebrow: "PROVIDER WARPLOOM", render };
})();
