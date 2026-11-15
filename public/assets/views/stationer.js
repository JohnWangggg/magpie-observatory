/* --------------------------------------------------------------- stationer
 * Stationer view — a row of stationers' stalls, one per provider.
 * Books stacked on the counter = tokens; a stationer wrapping
 * a parcel for live sessions; a torn page marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stationer";
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
    if (!rows.length) { host.innerHTML = `<div class="stt-empty">暂无书摊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — shop boards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const ctrY = floorY - 16;
      const paper = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8cbb0" : "#a89878";

      // the stall — a counter with a roof board
      g += `<rect x="${x - bW * .38}" y="${ctrY - 18}" width="${bW * .76}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .34}" y1="${ctrY - 18}" x2="${x - bW * .34}" y2="${ctrY - 26}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .34}" y1="${ctrY - 18}" x2="${x + bW * .34}" y2="${ctrY - 26}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - bW * .4}" y="${ctrY - 30}" width="${bW * .8}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // the counter — a solid front
      g += `<rect x="${x - bW * .36}" y="${ctrY}" width="${bW * .72}" height="16" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .36}" y="${ctrY}" width="${bW * .72}" height="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;

      // book stacks on the counter — piles, count by tokens
      const stacks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < stacks; s++) {
        const sx = x - bW * .3 + s * bW * .18;
        const sh = 2 + ((s + i) % 2);
        for (let b = 0; b < sh; b++) {
          g += `<rect x="${sx}" y="${ctrY - 4 - b * 3}" width="${bW * .1}" height="3" rx=".6"
            fill="${s === 0 && b === sh - 1 && r.err ? "var(--red)" : (b % 2 ? paper : "#8a6a58")}" stroke="${r.col}" stroke-width=".4"/>`;
        }
      }
      // an open book — displayed on the counter
      g += `<path d="M ${x + bW * .18} ${ctrY - 2} q ${bW * .04} -3 ${bW * .08} 0 l 0 3 q -${bW * .04} -2 -${bW * .08} 0 z" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x + bW * .18} ${ctrY - 2} q -${bW * .04} -3 -${bW * .08} 0 l 0 3 q ${bW * .04} -2 ${bW * .08} 0 z" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .18}" y1="${ctrY - 3.4}" x2="${x + bW * .18}" y2="${ctrY + .4}" stroke="${r.col}" stroke-width=".4"/>`;

      // a quill pot and inkwell — on the roof board
      g += `<rect x="${x - bW * .34}" y="${ctrY - 38}" width="5" height="7" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x - bW * .32} ${ctrY - 38} q 3 -8 7 -9 q -2 5 -3 9" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x - bW * .2}" y="${ctrY - 36}" width="4" height="5" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<ellipse cx="${x - bW * .2 + 2}" cy="${ctrY - 35}" rx="1.4" ry=".8" fill="#20304a"/>`;

      // a hanging sign — a book on a bracket
      g += `<line x1="${x + bW * .3}" y1="${ctrY - 30}" x2="${x + bW * .3}" y2="${ctrY - 36}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .26}" y="${ctrY - 36}" width="8" height="6" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .3}" y1="${ctrY - 36}" x2="${x + bW * .3}" y2="${ctrY - 30}" stroke="${r.col}" stroke-width=".4"/>`;

      // stationer wrapping for live sessions — figure behind the counter
      if (r.live) {
        g += `<g class="stt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .08} ${ctrY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn page — a ripped leaf on errors
      if (r.err) g += `<path d="M ${x + bW * .18} ${ctrY - 3} l 3 2 -2 2" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="stt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="stt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "书摊", eyebrow: "PROVIDER STATIONER", render };
})();
