/* ------------------------------------------------------------------ plumber
 * Plumber view — a row of plumbers' shops, one per provider.
 * Lead pipes racked on the wall = tokens; a plumber soldering
 * a joint for live sessions; a burst pipe marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "plumber";
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
    if (!rows.length) { host.innerHTML = `<div class="plb-empty">暂无管坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — workshop flags
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const lead = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#98a8b8" : "#687888";

      // the pipe rack — two rails on the wall
      g += `<line x1="${x - bW * .36}" y1="${floorY - 34}" x2="${x + bW * .1}" y2="${floorY - 34}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .36}" y1="${floorY - 26}" x2="${x + bW * .1}" y2="${floorY - 26}" stroke="${r.col}" stroke-width="1"/>`;
      // pipes on the rack — horizontal runs, count by tokens
      const pipes = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pipes; p++) {
        const py = floorY - 33 + p * 2.2;
        g += `<rect x="${x - bW * .34}" y="${py - 1.4}" width="${bW * .42}" height="2.8" rx="1.4" fill="${p === 0 && r.err ? "var(--red)" : lead}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${x - bW * .34 + bW * .12}" y1="${py - 1.4}" x2="${x - bW * .34 + bW * .12}" y2="${py + 1.4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a coiled pipe — hanging off the rail
      g += `<circle cx="${x + bW * .06}" cy="${floorY - 30}" r="4.5" fill="none" stroke="${lead}" stroke-width="1.6"/>`;
      g += `<circle cx="${x + bW * .06}" cy="${floorY - 30}" r="2" fill="none" stroke="${lead}" stroke-width="1.2"/>`;

      // a vertical stack — a rising main with a bend
      g += `<path d="M ${x - bW * .1} ${floorY} l 0 -14 q 0 -4 4 -4 l ${bW * .08} 0" fill="none" stroke="${lead}" stroke-width="2.4"/>`;
      g += `<rect x="${x - bW * .11}" y="${floorY - 8}" width="3" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;

      // the solder pot — a little brazier
      g += `<rect x="${x + bW * .18}" y="${floorY - 8}" width="10" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .18 + 5}" cy="${floorY - 7}" rx="4" ry="1.5" fill="#ff9a3a" stroke="${r.col}" stroke-width=".4" opacity=".8"/>`;
      g += `<path d="M ${x + bW * .18 + 3} ${floorY - 11} q 2 -3 4 0" fill="none" stroke="var(--muted)" stroke-width=".5" opacity=".7"/>`;
      // a ladle — resting on the pot
      g += `<line x1="${x + bW * .2}" y1="${floorY - 9}" x2="${x + bW * .26}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .265}" cy="${floorY - 15}" r="1.6" fill="${lead}" stroke="${r.col}" stroke-width=".5"/>`;

      // a work joint — pipes meeting at a flange on the bench
      g += `<rect x="${x + bW * .3}" y="${floorY - 14}" width="${bW * .16}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 18}" width="${bW * .06}" height="3" fill="${lead}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<rect x="${x + bW * .38}" y="${floorY - 17}" width="${bW * .05}" height="3" fill="${lead}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<circle cx="${x + bW * .38}" cy="${floorY - 15.5}" r="1.6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;

      // plumber soldering for live sessions — figure at the joint
      if (r.live) {
        g += `<g class="plb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .3} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="9" y2="13" stroke="${r.col}" stroke-width="1"/>
          <circle cx="10" cy="14" r="1.1" fill="#ffd23a"/>
        </g>`;
      }
      // burst pipe — a spray on errors
      if (r.err) {
        g += `<path d="M ${x - bW * .1} ${floorY - 20} l 5 -4 M ${x - bW * .08} ${floorY - 18} l 6 -2" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
        g += `<circle cx="${x - bW * .06}" cy="${floorY - 23}" r=".9" fill="var(--red)"/>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="plb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="plb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "管坊", eyebrow: "PROVIDER PLUMBER", render };
})();
