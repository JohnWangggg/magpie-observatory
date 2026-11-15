/* -------------------------------------------------------------- bricklayer
 * Bricklayer view — a row of rising walls, one per provider.
 * Courses laid on the wall = tokens; a bricklayer buttering
 * a brick for live sessions; a slipped course marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bricklayer";
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
    if (!rows.length) { host.innerHTML = `<div class="brl-empty">暂无砖墙</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a building plot
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const brick = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b86050" : "#804038";

      // the wall — a rising corner, courses by tokens
      const wallX = x - bW * .3;
      const wallW = bW * .56;
      const courses = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let c = 0; c < courses; c++) {
        const cy = floorY - 6 - c * 6;
        const off = c % 2 ? 3 : 0;
        for (let b = 0; b < 5; b++) {
          const bx = wallX + off + b * (wallW / 5);
          g += `<rect x="${bx}" y="${cy}" width="${wallW / 5 - 1.5}" height="5" fill="${c === courses - 1 && b === 4 && r.err ? "var(--red)" : brick}" stroke="${r.col}" stroke-width=".4"/>`;
        }
      }
      // a corner return — the wall turning at the left
      g += `<rect x="${wallX - 6}" y="${floorY - 6 - courses * 6 + 6}" width="6" height="${courses * 6 - 6}" fill="${brick}" stroke="${r.col}" stroke-width=".4" opacity=".7"/>`;

      // a scaffold — a plank on trestles beside the wall
      g += `<rect x="${x - bW * .4}" y="${floorY - 22}" width="${bW * .34}" height="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .36}" y1="${floorY - 22}" x2="${x - bW * .36}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .1}" y1="${floorY - 22}" x2="${x - bW * .1}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .36}" y1="${floorY - 10}" x2="${x - bW * .1}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".4"/>`;

      // a mortar board — on the scaffold
      g += `<rect x="${x - bW * .34}" y="${floorY - 26}" width="10" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<ellipse cx="${x - bW * .34 + 5}" cy="${floorY - 26}" rx="4" ry="1.5" fill="#a8a8a0" stroke="${r.col}" stroke-width=".4"/>`;
      // a hod — a carry box
      g += `<path d="M ${x - bW * .2} ${floorY - 26} l 0 -6 h 8 l 0 6 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x - bW * .19}" y="${floorY - 30}" width="6" height="4" fill="${brick}" stroke="${r.col}" stroke-width=".4"/>`;

      // a brick stack — beside the wall
      for (let b = 0; b < 3; b++) {
        g += `<rect x="${x + bW * .3}" y="${floorY - 4 - b * 4}" width="${bW * .1}" height="3.5" fill="${brick}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a plumb line — hanging off the corner
      g += `<line x1="${wallX - 3}" y1="${floorY - 6 - courses * 6 - 2}" x2="${wallX - 3}" y2="${floorY - 2}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<path d="M ${wallX - 3} ${floorY - 2} l -2 4 h 4 z" fill="${r.col}"/>`;
      // a line pin — the string course guide
      g += `<line x1="${wallX}" y1="${floorY - 6 - courses * 6 + 3}" x2="${wallX + wallW}" y2="${floorY - 6 - courses * 6 + 3}" stroke="${r.col}" stroke-width=".4" stroke-dasharray="2 2"/>`;

      // bricklayer buttering for live sessions — figure at the wall
      if (r.live) {
        g += `<g class="brl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .12} ${floorY - 6 - courses * 6 - 8})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
          <rect x="9" y="8" width="4" height="3" rx="1" fill="${brick}" stroke="${r.col}" stroke-width=".4"/>
        </g>`;
      }
      // slipped course — a crooked brick on errors
      if (r.err) g += `<rect x="${wallX + wallW - 8}" y="${floorY - 6 - courses * 6 - 4}" width="8" height="4" fill="var(--red)" stroke="${r.col}" stroke-width=".4" transform="rotate(14 ${wallX + wallW - 4} ${floorY - 6 - courses * 6 - 2})"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="brl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="brl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "砖墙", eyebrow: "PROVIDER BRICKLAYER", render };
})();
