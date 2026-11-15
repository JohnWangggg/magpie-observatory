/* ---------------------------------------------------------------- gooseherd
 * Gooseherd view — a row of greens by the pond, one per provider.
 * Geese on the green = tokens; a gooseherd calling
 * for live sessions; a strayed gosling marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gooseherd";
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
    if (!rows.length) { host.innerHTML = `<div class="gsh-empty">暂无鹅滩</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const feather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0dcd0" : "#a8a498";

      // the pond — a water edge at the right
      g += `<path d="M ${x + bW * .14} ${floorY} q ${bW * .1} -6 ${bW * .3} -2 l 0 8 l -${bW * .34} 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + bW * .16} ${floorY + 2} q ${bW * .08} -4 ${bW * .2} -1" fill="none" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      // a goose on the water
      g += `<ellipse cx="${x + bW * .3}" cy="${floorY + 3}" rx="5" ry="3" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x + bW * .33} ${floorY + 2} q 3 -6 5 -7 l 1 2 q -3 2 -4 5 z" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x + bW * .38} ${floorY - 6} l 2 1 -2 1 z" fill="#d8883a"/>`;

      // geese on the green — count by tokens
      const geese = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < geese; t++) {
        const gx = x - bW * .36 + t * bW * .12;
        const gy = floorY - 4;
        g += `<ellipse cx="${gx}" cy="${gy - 3}" rx="4.5" ry="3" fill="${t === geese - 1 && r.err ? "var(--red)" : feather}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${gx + 3} ${gy - 4} q 3 -6 5 -8 l 1 2 q -3 2 -4 6 z" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<path d="M ${gx + 8} ${gy - 12} l 2 1 -2 1 z" fill="#d8883a" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<line x1="${gx - 1}" y1="${gy}" x2="${gx - 1}" y2="${floorY}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // goslings — small followers
      for (let t = 0; t < 2; t++) {
        const gx = x + bW * .02 + t * 6;
        g += `<ellipse cx="${gx}" cy="${floorY - 3}" rx="2.5" ry="1.8" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${gx + 2}" cy="${floorY - 5}" r="1.2" fill="${feather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a basket — for eggs
      g += `<ellipse cx="${x - bW * .02}" cy="${floorY - 3}" rx="5" ry="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .06} ${floorY - 5} q 4 -3 8 0" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      for (let e = 0; e < 2; e++) {
        g += `<ellipse cx="${x - bW * .03 + e * 3}" cy="${floorY - 5}" rx="1.2" ry="1.5" fill="${feather}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a wattle fence — a low hurdle
      for (let h = 0; h < 3; h++) {
        g += `<line x1="${x - bW * .44 + h * bW * .1}" y1="${floorY}" x2="${x - bW * .44 + h * bW * .1}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      g += `<line x1="${x - bW * .44}" y1="${floorY - 6}" x2="${x - bW * .24}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .44}" y1="${floorY - 9}" x2="${x - bW * .24}" y2="${floorY - 9}" stroke="${r.col}" stroke-width=".5"/>`;
      // a crook — the herder's stick
      g += `<line x1="${x + bW * .42}" y1="${floorY}" x2="${x + bW * .42}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + bW * .42} ${floorY - 20} q 4 -3 5 0" fill="none" stroke="${r.col}" stroke-width="1"/>`;

      // gooseherd calling for live sessions — figure waving arms
      if (r.live) {
        g += `<g class="gsh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .02} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="3" x2="11" y2="-4" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="3" x2="-11" y2="-4" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // strayed gosling — off by the fence on errors
      if (r.err) g += `<ellipse cx="${x - bW * .42}" cy="${floorY - 3}" rx="3" ry="2" fill="var(--red)" stroke="${r.col}" stroke-width=".5"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="gsh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gsh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鹅滩", eyebrow: "PROVIDER GOOSEHERD", render };
})();
