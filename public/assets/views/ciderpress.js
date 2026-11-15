/* ---------------------------------------------------------------- ciderpress
 * Ciderpress view — a row of screw presses, one per provider.
 * Juice running off the pomace cheese = tokens; a pressman
 * hauling the lever for live sessions; a burst cheese marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ciderpress";
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
    if (!rows.length) { host.innerHTML = `<div class="cp-empty">暂无苹果酒坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // press-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8a838" : "#b08828";
      const bedY = floorY - 8;
      // press bed — a stone trough
      g += `<rect x="${x - seg * .3}" y="${bedY - 4}" width="${seg * .6}" height="8" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // pomace cheese — a wrapped cake on the bed
      const cheeseH = 6 + (r.tok / maxTok) * 10;
      g += `<rect x="${x - seg * .2}" y="${bedY - 4 - cheeseH}" width="${seg * .4}" height="${cheeseH}" rx="2" fill="${r.err ? "var(--red)" : tint}" stroke="${r.col}" stroke-width=".9" opacity=".9"/>`;
      // pressing screw above the cheese
      g += `<line x1="${x}" y1="${bedY - cheeseH - 4}" x2="${x}" y2="${bedY - cheeseH - 26}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${x - 8}" y1="${bedY - cheeseH - 20}" x2="${x + 8}" y2="${bedY - cheeseH - 20}" stroke="${r.col}" stroke-width="1.4"/>`;
      // juice running off — drips into the trough, count by tokens
      const drips = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < drips; d++) {
        g += `<circle cx="${x - seg * .15 + d * (seg * .1)}" cy="${bedY - 1}" r="1.4" fill="${tint}" opacity=".9"/>`;
      }
      // pressman hauling the lever for live sessions
      if (r.live) {
        g += `<g class="cp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + seg * .34} ${bedY - cheeseH - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="2" x2="-16" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst cheese — pomace spilling on errors
      if (r.err) g += `<path d="M ${x + seg * .15} ${bedY - 4 - cheeseH} l 6 4 l -4 5" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "苹果酒坊", eyebrow: "PROVIDER CIDERPRESS", render };
})();
