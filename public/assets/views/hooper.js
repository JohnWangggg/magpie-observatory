/* -------------------------------------------------------------------- hooper
 * Hooper view — a row of hoop drivers, one per provider.
 * Hoops driven down the staves = tokens; a hooper at the
 * driving iron for live sessions; a dropped hoop marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hooper";
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
    if (!rows.length) { host.innerHTML = `<div class="hp-empty">暂无箍匠坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cooperage floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8b8c0" : "#787880";
      const caskW = seg * .4;
      const caskY = floorY - 30;
      const caskH = 26;
      // the cask — a staved barrel on its side
      g += `<ellipse cx="${x}" cy="${caskY + caskH / 2}" rx="${caskW * .28}" ry="${caskH / 2}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<ellipse cx="${x}" cy="${caskY + caskH / 2}" rx="${caskW * .14}" ry="${caskH * .3}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // stave lines — vertical grooves on the cask
      for (let s = -1; s <= 1; s++) {
        g += `<line x1="${x + s * caskW * .12}" y1="${caskY + 4}" x2="${x + s * caskW * .12}" y2="${caskY + caskH - 4}" stroke="${r.col}" stroke-width=".7" opacity=".5"/>`;
      }
      // hoops — rings drawn up the cask, count by tokens
      const hoops = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < hoops; h++) {
        const hx = x - caskW * .18 + h * caskW * .12;
        g += `<ellipse cx="${hx}" cy="${caskY + caskH / 2}" rx="${caskW * .04}" ry="${caskH * .32}" fill="none" stroke="${h === 0 && r.err ? "var(--red)" : iron}" stroke-width="1.2"/>`;
      }
      // croze — the groove inside for the head
      g += `<line x1="${x + caskW * .22}" y1="${caskY + 6}" x2="${x + caskW * .22}" y2="${caskY + caskH - 6}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1"/>`;
      // driving iron — a drift beside the cask
      g += `<line x1="${x - caskW * .34}" y1="${floorY - 12}" x2="${x - caskW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x - caskW * .36}" y1="${floorY - 12}" x2="${x - caskW * .32}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1.4"/>`;
      // hooper at the iron for live sessions — figure leaning on the drift
      if (r.live) {
        g += `<g class="hp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - caskW * .44} ${caskY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // dropped hoop — a ring slipped on the floor on errors
      if (r.err) g += `<ellipse cx="${x + caskW * .3}" cy="${floorY - 4}" rx="4" ry="2.5" fill="none" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "箍匠坊", eyebrow: "PROVIDER HOOPER", render };
})();
