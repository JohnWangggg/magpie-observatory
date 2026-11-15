/* --------------------------------------------------------------- swineherd
 * Swineherd view — a row of mast woods, one per provider.
 * Pigs on the acorns = tokens; a swineherd shaking
 * the oak for live sessions; a strayed shoat marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "swineherd";
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
    if (!rows.length) { host.innerHTML = `<div class="swd-empty">暂无橡林</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const pig = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8988a" : "#8a6058";

      // the oak — a mast tree dropping acorns
      g += `<path d="M ${x - bW * .3} ${floorY} q -2 -18 -4 -26 l 3 -2 q 4 10 4 28 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x - bW * .32}" cy="${floorY - 38}" r="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .26}" cy="${floorY - 34}" r="7" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // acorns falling — small cups
      for (let a = 0; a < 4; a++) {
        g += `<ellipse cx="${x - bW * .3 + a * 4}" cy="${floorY - 20 + a * 4}" rx="1" ry="1.4" fill="#c8a048"/>`;
        g += `<path d="M ${x - bW * .3 + a * 4 - 1} ${floorY - 22 + a * 4} h 2" stroke="${r.col}" stroke-width=".4" fill="none"/>`;
      }
      // scattered mast — acorns on the ground
      for (let a = 0; a < 6; a++) {
        g += `<ellipse cx="${x - bW * .38 + a * bW * .1}" cy="${floorY - 1}" rx="1.2" ry=".8" fill="#c8a048" opacity=".7"/>`;
      }

      // pigs — rooting for mast, count by tokens
      const pigs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pigs; p++) {
        const px = x - bW * .12 + p * bW * .12;
        const py = floorY - 4;
        g += `<ellipse cx="${px}" cy="${py - 3}" rx="5" ry="3.4" fill="${p === pigs - 1 && r.err ? "var(--red)" : pig}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<ellipse cx="${px + 4}" cy="${py - 4}" rx="2" ry="2.2" fill="${pig}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<ellipse cx="${px + 5.4}" cy="${py - 4}" rx=".8" ry="1" fill="${r.col}"/>`;
        g += `<path d="M ${px - 5} ${py - 4} q -2 -1 -2 -3" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${px - 2}" y1="${py}" x2="${px - 2}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<line x1="${px + 2}" y1="${py}" x2="${px + 2}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // a trough — a feeding trough
      g += `<rect x="${x + bW * .4}" y="${floorY - 5}" width="${bW * .08}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a hurdle — a woven fence panel
      g += `<rect x="${x + bW * .18}" y="${floorY - 14}" width="${bW * .16}" height="10" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      for (let h = 0; h < 3; h++) {
        g += `<line x1="${x + bW * .18}" y1="${floorY - 11 + h * 3}" x2="${x + bW * .34}" y2="${floorY - 11 + h * 3}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      for (let h = 0; h < 4; h++) {
        g += `<line x1="${x + bW * .2 + h * bW * .045}" y1="${floorY - 14}" x2="${x + bW * .2 + h * bW * .045}" y2="${floorY - 4}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a staff — the herder's stick
      g += `<line x1="${x + bW * .44}" y1="${floorY}" x2="${x + bW * .44}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1"/>`;

      // swineherd shaking for live sessions — figure at the oak
      if (r.live) {
        g += `<g class="swd-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .14} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="4" x2="-12" y2="-6" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // strayed shoat — outside the hurdle on errors
      if (r.err) g += `<ellipse cx="${x + bW * .44}" cy="${floorY - 3}" rx="4" ry="2.6" fill="var(--red)" stroke="${r.col}" stroke-width=".5"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="swd-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="swd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "橡林", eyebrow: "PROVIDER SWINEHERD", render };
})();
