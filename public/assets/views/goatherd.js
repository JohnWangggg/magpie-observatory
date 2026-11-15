/* ----------------------------------------------------------------- goatherd
 * Goatherd view — a row of rocky browses, one per provider.
 * Goats on the crag = tokens; a goatherd calling
 * for live sessions; a strayed kid marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "goatherd";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ghd-empty">暂无山羊坡</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const goat = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8d0c0" : "#989080";

      // the crag — a rocky outcrop the goats stand on
      g += `<path d="M ${x - bW * .34} ${floorY} l 6 -14 8 -6 10 4 8 -8 10 14 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .2} ${floorY - 14} l 4 -4 M ${x - bW * .06} ${floorY - 18} l 4 4" stroke="${r.col}" stroke-width=".4" fill="none"/>`;

      // goats — sure-footed on the crag, count by tokens
      const goats = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < goats; t++) {
        const gx = x - bW * .26 + t * bW * .1;
        const gy = floorY - 12 - (t % 3) * 5;
        g += `<ellipse cx="${gx}" cy="${gy}" rx="4" ry="3" fill="${t === goats - 1 && r.err ? "var(--red)" : goat}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${gx + 3}" cy="${gy - 3}" r="1.8" fill="${goat}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<path d="M ${gx + 3.5} ${gy - 5} l 1 -2 M ${gx + 4.5} ${gy - 5} l 1 -2" stroke="${r.col}" stroke-width=".5" fill="none"/>`;
        g += `<line x1="${gx - 2}" y1="${gy + 3}" x2="${gx - 2}" y2="${gy + 6}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${gx + 1}" y1="${gy + 3}" x2="${gx + 1}" y2="${gy + 6}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // a kid — a small strayer at the edge
      g += `<ellipse cx="${x + bW * .3}" cy="${floorY - 4}" rx="3" ry="2" fill="${goat}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x + bW * .32}" cy="${floorY - 6}" r="1.2" fill="${goat}" stroke="${r.col}" stroke-width=".4"/>`;
      // a browse bush — scrub on the slope
      g += `<circle cx="${x - bW * .4}" cy="${floorY - 6}" r="4" fill="${r.col}" opacity=".3"/>`;
      g += `<circle cx="${x - bW * .42}" cy="${floorY - 8}" r="2.5" fill="${r.col}" opacity=".2"/>`;
      // a staff — the goatherd's crook
      g += `<line x1="${x + bW * .4}" y1="${floorY}" x2="${x + bW * .4}" y2="${floorY - 22}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + bW * .4} ${floorY - 22} q 4 -4 5 0" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // a bell — on a strap
      g += `<line x1="${x + bW * .42}" y1="${floorY - 16}" x2="${x + bW * .44}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x + bW * .43} ${floorY - 12} l -1 -3 h 3 l -1 3 z" fill="#d8a040" stroke="${r.col}" stroke-width=".4"/>`;

      // goatherd calling for live sessions — figure on a rock
      if (r.live) {
        g += `<g class="ghd-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .12} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="3" x2="10" y2="-2" stroke="${r.col}" stroke-width="1"/>
          <path d="M 10 -2 l 3 -2 M 10 -2 l 3 2" stroke="${r.col}" stroke-width=".6" fill="none"/>
        </g>`;
      }
      // strayed kid — a lost one off the crag on errors
      if (r.err) g += `<line x1="${x + bW * .3}" y1="${floorY - 4}" x2="${x + bW * .36}" y2="${floorY - 8}" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="ghd-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ghd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "山羊坡", eyebrow: "PROVIDER GOATHERD", render };
})();
