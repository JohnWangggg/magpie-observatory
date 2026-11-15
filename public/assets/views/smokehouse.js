/* -------------------------------------------------------------- smokehouse
 * Smokehouse view — a row of smokehouses, one per provider. Smoke
 * from the chimney = tokens; hanging joints inside for live
 * sessions; a cracked wall marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "smokehouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sh-empty">暂无熏房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const houseW = seg * .48;
      const houseH = 44 + (r.tok / maxTok) * 22;
      const houseY = yardY - houseH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a07848" : "#786848";
      // house body — stone base + timber upper
      g += `<rect x="${x - houseW / 2}" y="${houseY + houseH * .4}" width="${houseW}" height="${houseH * .6}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      g += `<rect x="${x - houseW / 2}" y="${houseY}" width="${houseW}" height="${houseH * .4}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // roof
      g += `<path d="M ${x - houseW / 2 - 4} ${houseY} L ${x} ${houseY - 16} L ${x + houseW / 2 + 4} ${houseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // chimney
      g += `<rect x="${x + houseW / 4}" y="${houseY - 14}" width="8" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // smoke puffs — count by tokens
      const puffs = Math.min(7, Math.ceil(r.tok / maxTok * 7));
      for (let s = 0; s < puffs; s++) {
        const sx = x + houseW / 4 + 4 + s * 6;
        const sy = houseY - 20 - s * 8;
        g += `<circle class="sh-smoke" style="animation-delay: ${(i * .3 + s * .18).toFixed(1)}s" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${(4 + s * 1.8).toFixed(1)}" fill="${tint}" opacity="${(.9 - s * .1).toFixed(1)}"/>`;
      }
      // hanging joints inside for live sessions — cutaway
      if (r.live) {
        const joints = Math.min(3, r.live);
        for (let j = 0; j < joints; j++) {
          const jx = x - houseW * .3 + j * 10;
          g += `<line x1="${jx.toFixed(0)}" y1="${houseY + houseH * .4}" x2="${jx.toFixed(0)}" y2="${houseY + houseH * .5}" stroke="${r.col}" stroke-width="1"/>`;
          g += `<ellipse cx="${jx.toFixed(0)}" cy="${houseY + houseH * .58}" rx="3" ry="5" fill="${tint}" opacity=".8"/>`;
        }
      }
      // door
      g += `<rect x="${x - houseW * .15}" y="${yardY - 16}" width="12" height="16" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      // cracked wall on errors
      if (r.err) g += `<path d="M ${x - houseW * .2} ${houseY + houseH * .5} L ${x + houseW * .05} ${houseY + houseH * .7} L ${x - houseW * .1} ${yardY}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="sh-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "熏房", eyebrow: "PROVIDER SMOKEHOUSE", render };
})();
