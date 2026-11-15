/* -------------------------------------------------------------------- sower
 * Sower view — a row of seed fields, one per provider.
 * Seed drills scored in the soil = tokens; a sower casting
 * the grain for live sessions; spilled seed marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sower";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="swr-empty">暂无播田</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const grain = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a048" : "#806828";

      // seed drills — scored rows, count by tokens
      const drills = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let d = 0; d < drills; d++) {
        const dy = floorY - 3 - d * 5;
        const inset = d * 5;
        g += `<line x1="${x - bW * .42 + inset}" y1="${dy}" x2="${x + bW * .42 - inset}" y2="${dy}" stroke="${r.col}" stroke-width=".8" opacity="${.4 + d * .12}"/>`;
        // seed dots in the drill
        for (let s = 0; s < 5; s++) {
          g += `<circle cx="${x - bW * .38 + inset + s * bW * .15}" cy="${dy}" r=".9" fill="${d === drills - 1 && s === 4 && r.err ? "var(--red)" : grain}"/>`;
        }
      }
      // the sower's pouch — a seed bag on the ground
      g += `<path d="M ${x - bW * .34} ${floorY} l -4 -10 q 4 -4 10 -4 l 0 14 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<ellipse cx="${x - bW * .33}" cy="${floorY - 14}" rx="4" ry="1.6" fill="${grain}" stroke="${r.col}" stroke-width=".4"/>`;
      // a harrow — a toothed drag beside the field
      g += `<rect x="${x + bW * .28}" y="${floorY - 10}" width="${bW * .14}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x + bW * .29 + t * bW * .04}" y1="${floorY - 6}" x2="${x + bW * .29 + t * bW * .04}" y2="${floorY - 1}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      g += `<line x1="${x + bW * .28}" y1="${floorY - 10}" x2="${x + bW * .2}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".7"/>`;
      // a basket of seed — near the bag
      g += `<ellipse cx="${x - bW * .16}" cy="${floorY - 4}" rx="6" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .16}" cy="${floorY - 6}" rx="5" ry="2" fill="${grain}" stroke="${r.col}" stroke-width=".4"/>`;
      // scattered cast — an arc of seed mid-air
      for (let s = 0; s < 6; s++) {
        const a = -.3 - s * .22;
        g += `<circle cx="${x - bW * .05 + Math.cos(a) * 16}" cy="${floorY - 18 + Math.sin(a) * 10}" r=".9" fill="${grain}" opacity=".8"/>`;
      }

      // sower casting for live sessions — figure mid-throw
      if (r.live) {
        g += `<g class="swr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="4" x2="12" y2="-4" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-8" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // spilled seed — a splash off the drill on errors
      if (r.err) {
        for (let s = 0; s < 4; s++) {
          g += `<circle cx="${x - bW * .36 + s * 3}" cy="${floorY - 14 - s * 2}" r="1" fill="var(--red)"/>`;
        }
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="swr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="swr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "播田", eyebrow: "PROVIDER SOWER", render };
})();
