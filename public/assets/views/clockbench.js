/* ---------------------------------------------------------------- clockbench
 * Clockbench view — a row of going trains, one per provider.
 * Wheels meshed on the brass plate = tokens; a horologist at
 * the fusee for live sessions; a broken tooth marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "clockbench";
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
    if (!rows.length) { host.innerHTML = `<div class="ck-empty">暂无钟表坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench-top
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const brass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#b08840";
      const trainH = H * .42;
      const plateY = floorY - trainH * .4;
      const plateW = seg * .45;
      // the brass plate — a movement plate on feet
      g += `<rect x="${x - plateW / 2}" y="${plateY - trainH * .25}" width="${plateW}" height="${trainH * .35}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - plateW * .32}" y1="${plateY + trainH * .1}" x2="${x - plateW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + plateW * .32}" y1="${plateY + trainH * .1}" x2="${x + plateW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // going train — meshed wheels down the plate, count by tokens
      const wheels = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < wheels; w++) {
        const wy = plateY - trainH * .15 + w * (trainH * .2 / wheels);
        const wr = plateW * .14 - w * 1.5;
        g += `<circle cx="${x - plateW * .18 + w * plateW * .12}" cy="${wy}" r="${Math.max(2, wr)}" fill="none" stroke="${w === 0 && r.err ? "var(--red)" : brass}" stroke-width="1.2"/>`;
        g += `<circle cx="${x - plateW * .18 + w * plateW * .12}" cy="${wy}" r="1" fill="${r.col}"/>`;
      }
      // escapement — an anchor above the train
      g += `<path d="M ${x - plateW * .05} ${plateY - trainH * .18} l -3 -6 l 6 0 z" fill="${r.err ? "var(--red)" : r.col}" opacity=".9"/>`;
      // a broken tooth — a gap in the last wheel on errors
      if (r.err) {
        g += `<line x1="${x + plateW * .2}" y1="${plateY - trainH * .1}" x2="${x + plateW * .26}" y2="${plateY - trainH * .04}" stroke="var(--red)" stroke-width="1.6"/>`;
      }
      // fusee and chain — a cone at the barrel end
      g += `<path d="M ${x - plateW * .35} ${plateY + trainH * .05} l 0 -10 l 8 10 z" fill="${brass}" stroke="${r.col}" stroke-width=".8"/>`;
      // horologist at the fusee for live sessions — a figure with a loupe
      if (r.live) {
        g += `<g class="ck-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - plateW * .42} ${plateY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="6" cy="-2" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="8" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ck-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ck-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟表坊", eyebrow: "PROVIDER CLOCKBENCH", render };
})();
