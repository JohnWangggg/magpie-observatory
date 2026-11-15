/* ------------------------------------------------------------------ turnery
 * Turnery view — a row of pole lathes, one per provider. Bowls
 * coming off the mandrel = tokens; a turner treadling for live
 * sessions; a cracked bowl marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "turnery";
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
    if (!rows.length) { host.innerHTML = `<div class="tu-empty">暂无车旋坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a878" : "#a08050";
      const bedY = floorY - 18;
      // lathe bed — a beam on two legs
      g += `<rect x="${x - seg * .32}" y="${bedY}" width="${seg * .64}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - seg * .26}" y1="${bedY + 5}" x2="${x - seg * .26}" y2="${floorY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + seg * .26}" y1="${bedY + 5}" x2="${x + seg * .26}" y2="${floorY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // headstock + tailstock
      g += `<rect x="${x - seg * .28}" y="${bedY - 10}" width="7" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x + seg * .28 - 7}" y="${bedY - 8}" width="7" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // workpiece spinning between centres — a bowl blank
      const blankW = 10 + (r.tok / maxTok) * 10;
      g += `<ellipse cx="${x}" cy="${bedY - 6}" rx="${blankW}" ry="6" fill="${r.err ? "var(--red)" : tint}" stroke="${r.col}" stroke-width=".9" opacity=".9"/>`;
      // shavings — curls under the work, count by tokens
      const shav = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < shav; s++) {
        g += `<path d="M ${x - 8 + s * 8} ${bedY + 8} q 3 4 6 0" stroke="${tint}" stroke-width="1" fill="none" opacity=".7"/>`;
      }
      // turner treadling for live sessions — figure at the treadle
      if (r.live) {
        g += `<g class="tu-turner" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .34 - 8} ${floorY - 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="12" y2="16" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // cracked bowl — a split in the blank on errors
      if (r.err) g += `<path d="M ${x - 2} ${bedY - 10} l 2 6 l -3 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tu-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "车旋坊", eyebrow: "PROVIDER TURNERY", render };
})();
