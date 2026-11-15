/* ------------------------------------------------------------------- vellum
 * Vellum view — a row of vellum frames, one per provider.
 * Calfskins laced to the frame = tokens; a vellum worker
 * pouncing for live sessions; a holed skin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vellum";
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
    if (!rows.length) { host.innerHTML = `<div class="vlm-empty">暂无犊皮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const frameY = floorY - 30;
      const skin = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8dcc8" : "#b0a080";
      // the frame — a rectangular stretcher with pegs
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="34" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="34" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .38}" y1="${frameY}" x2="${x + bW * .32}" y2="${frameY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .38}" y1="${frameY - 10}" x2="${x + bW * .32}" y2="${frameY - 10}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      // pegs along the rails
      for (let p = 0; p < 5; p++) {
        g += `<circle cx="${x - bW * .34 + p * bW * .17}" cy="${frameY}" r="1" fill="${r.col}"/>`;
      }
      // calfskins laced — oval skins on the frame, count by tokens
      const skins = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < skins; s++) {
        const sx = x - bW * .26 + s * bW * .2;
        g += `<ellipse cx="${sx}" cy="${frameY - 2}" rx="7" ry="10" fill="${s === 0 && r.err ? "var(--red)" : skin}" stroke="${r.col}" stroke-width=".8"/>`;
        // lacing cords to the pegs
        g += `<line x1="${sx - 7}" y1="${frameY - 2}" x2="${sx - 9}" y2="${frameY - 4}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx + 7}" y1="${frameY - 2}" x2="${sx + 9}" y2="${frameY - 4}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx}" y1="${frameY - 12}" x2="${sx}" y2="${frameY - 14}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a pumice stone — a grey block on the bench
      g += `<rect x="${x - bW * .44}" y="${floorY - 6}" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .4}" cy="${floorY - 3}" rx="2.5" ry="1.5" fill="#8a8a8a" stroke="${r.col}" stroke-width=".4"/>`;
      // a chalk bag for pouncing
      g += `<path d="M ${x + bW * .36} ${floorY - 4} l 3 -8 3 8 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .39}" y1="${floorY - 4}" x2="${x + bW * .39}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;
      // a ruled guide — a sheet with lines beside
      g += `<rect x="${x - bW * .14}" y="${floorY - 4}" width="${bW * .28}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let rl = 0; rl < 3; rl++) {
        g += `<line x1="${x - bW * .14}" y1="${floorY - 4 + rl * 1.4}" x2="${x + bW * .14}" y2="${floorY - 4 + rl * 1.4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // vellum worker pouncing for live sessions — figure at the frame
      if (r.live) {
        g += `<g class="vlm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${frameY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // holed skin — a puncture in the vellum on errors
      if (r.err) g += `<circle cx="${x - bW * .26}" cy="${frameY - 2}" r="1.8" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="vlm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="vlm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "犊皮纸", eyebrow: "PROVIDER VELLUM", render };
})();
