/* -------------------------------------------------------------------- finery
 * Finery view — a row of refining hearths, one per provider.
 * Malleable blooms drawn from the charcoal bed = tokens; a
 * finer raking the hearth for live sessions; a chilled pig
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "finery";
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
    if (!rows.length) { host.innerHTML = `<div class="fy-empty">暂无精炼炉</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // forge floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d08858" : "#a06838";
      const hearthY = floorY - 24;
      // refining hearth — a square firebed on a plinth
      g += `<rect x="${x - seg * .28}" y="${hearthY}" width="${seg * .56}" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - seg * .22}" y="${floorY - 6}" width="${seg * .44}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // charcoal bed on the hearth
      g += `<rect x="${x - seg * .24}" y="${hearthY - 4}" width="${seg * .48}" height="6" rx="2" fill="#483028" stroke="${r.col}" stroke-width=".8"/>`;
      // embers in the bed — glow by tokens
      const embers = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let e = 0; e < embers; e++) {
        g += `<circle cx="${x - seg * .15 + e * (seg * .15)}" cy="${hearthY - 2}" r="1.6" fill="var(--amber)" opacity=".9"/>`;
      }
      // malleable blooms drawn — lumps beside, count by tokens
      const blooms = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < blooms; b++) {
        g += `<ellipse cx="${x + seg * .34 + b * 7}" cy="${floorY - 4}" rx="4" ry="3" fill="${b === 0 && r.err ? "var(--red)" : iron}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // finer raking the hearth for live sessions
      if (r.live) {
        g += `<g class="fy-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3 - 8} ${floorY - 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="16" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // chilled pig — a hard grey lump on errors
      if (r.err) g += `<ellipse cx="${x + seg * .34}" cy="${floorY - 6}" rx="4.5" ry="3" fill="var(--red)" opacity=".6"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="fy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "精炼炉", eyebrow: "PROVIDER FINERY", render };
})();
