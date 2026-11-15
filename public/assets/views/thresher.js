/* ----------------------------------------------------------------- thresher
 * Thresher view — a row of threshing floors, one per provider.
 * Grain heaps winnowed = tokens; a thresher swinging
 * the flail for live sessions; a spoiled heap marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "thresher";
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
    if (!rows.length) { host.innerHTML = `<div class="thr-empty">暂无打场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wheat = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#987838";

      // the barn — a wall and a door behind the floor
      g += `<rect x="${x - bW * .4}" y="${floorY - 34}" width="${bW * .8}" height="34" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .4} ${floorY - 34} L ${x} ${floorY - 46} L ${x + bW * .4} ${floorY - 34}" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .1}" y="${floorY - 20}" width="${bW * .2}" height="20" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .1}" y1="${floorY - 10}" x2="${x + bW * .1}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x}" y1="${floorY - 20}" x2="${x}" y2="${floorY}" stroke="${r.col}" stroke-width=".4"/>`;

      // the floor — a cleared patch before the door
      g += `<ellipse cx="${x - bW * .14}" cy="${floorY - 4}" rx="${bW * .22}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // unthreshed sheaves — a pile on the floor
      g += `<path d="M ${x - bW * .3} ${floorY - 4} q 4 -10 8 0 q -4 2 -8 0 M ${x - bW * .22} ${floorY - 4} q 4 -8 8 0 q -4 2 -8 0" fill="${wheat}" stroke="${r.col}" stroke-width=".5"/>`;

      // winnowed heaps — mounds of grain, count by tokens
      const heaps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < heaps; h++) {
        const hx = x + bW * .1 + h * bW * .14;
        g += `<path d="M ${hx - 6} ${floorY} q 6 -${7 + h} 12 0 z" fill="${h === heaps - 1 && r.err ? "var(--red)" : wheat}" stroke="${r.col}" stroke-width=".6"/>`;
        for (let s = 0; s < 4; s++) {
          g += `<circle cx="${hx - 3 + s * 2}" cy="${floorY - 2 - (s % 2)}" r=".7" fill="${r.col}"/>`;
        }
      }
      // a winnowing basket — beside the heaps
      g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 4}" rx="6" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 5}" rx="5" ry="2" fill="${wheat}" stroke="${r.col}" stroke-width=".4"/>`;
      // chaff — drifting motes
      for (let c = 0; c < 4; c++) {
        g += `<circle cx="${x + bW * .2 + c * 5}" cy="${floorY - 14 - c * 3}" r=".7" fill="var(--muted)" opacity=".5"/>`;
      }
      // a flail — leaning on the barn door
      g += `<line x1="${x - bW * .04}" y1="${floorY}" x2="${x - bW * .02}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .02}" y1="${floorY - 14}" x2="${x + bW * .02}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".8"/>`;

      // thresher swinging for live sessions — figure over the floor
      if (r.live) {
        g += `<g class="thr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="3" x2="10" y2="-2" stroke="${r.col}" stroke-width="1"/>
          <line x1="10" y1="-2" x2="14" y2="4" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // spoiled heap — a scatter on errors
      if (r.err) {
        for (let s = 0; s < 5; s++) {
          g += `<circle cx="${x + bW * .1 + (heaps - 1) * bW * .14 + s * 2}" cy="${floorY - 6 - s}" r=".9" fill="var(--red)"/>`;
        }
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="thr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="thr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "打场", eyebrow: "PROVIDER THRESHER", render };
})();
