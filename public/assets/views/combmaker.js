/* --------------------------------------------------------------- combmaker
 * Combmaker view — a row of combmakers' benches, one per provider.
 * Horn combs hung on the rack = tokens; a combmaker sawing teeth
 * for live sessions; a split tine marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "combmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="cmk-empty">暂无栉坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a work-room floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const benchY = floorY - 14;
      const horn = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a8" : "#a08860";

      // the bench — a plank on legs
      g += `<rect x="${x - bW * .36}" y="${benchY}" width="${bW * .72}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .3}" y="${benchY + 5}" width="5" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .25}" y="${benchY + 5}" width="5" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // a horn blank clamped on the bench — a curved arc
      g += `<path d="M ${x - bW * .1} ${benchY} q ${bW * .1} -12 ${bW * .2} -4" fill="none" stroke="${horn}" stroke-width="4" stroke-linecap="round"/>`;
      g += `<rect x="${x - bW * .06}" y="${benchY - 8}" width="6" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .03}" y1="${benchY - 8}" x2="${x - bW * .03}" y2="${benchY}" stroke="${r.col}" stroke-width=".5"/>`;

      // a saw — leaning against the bench
      g += `<line x1="${x - bW * .36}" y1="${benchY}" x2="${x - bW * .42}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x - bW * .42} ${benchY - 14} l 6 -2 -4 -4 z" fill="${horn}" stroke="${r.col}" stroke-width=".5"/>`;

      // a comb rack — a rail with hung combs, count by tokens
      g += `<line x1="${x + bW * .14}" y1="${benchY - 26}" x2="${x + bW * .14}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .38}" y1="${benchY - 26}" x2="${x + bW * .38}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .1}" y1="${benchY - 26}" x2="${x + bW * .42}" y2="${benchY - 26}" stroke="${r.col}" stroke-width="1"/>`;
      const combs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < combs; c++) {
        const cx = x + bW * .14 + c * bW * .07;
        // a comb — back and teeth
        g += `<rect x="${cx}" y="${benchY - 24}" width="${bW * .05}" height="4" rx="2" fill="${c === 0 && r.err ? "var(--red)" : horn}" stroke="${r.col}" stroke-width=".5"/>`;
        for (let t = 0; t < 3; t++) {
          g += `<line x1="${cx + 1 + t * 2.4}" y1="${benchY - 20}" x2="${cx + 1 + t * 2.4}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".5"/>`;
        }
      }

      // a basket of horn scraps
      g += `<path d="M ${x - bW * .46} ${floorY - 2} l 4 -8 8 0 4 8 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .42} ${floorY - 10} q 4 -4 8 0" fill="none" stroke="${horn}" stroke-width="2" stroke-linecap="round"/>`;

      // combmaker sawing for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="cmk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .02} ${benchY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="12" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-9" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split tine — a cracked comb on errors
      if (r.err) g += `<path d="M ${x + bW * .16} ${benchY - 22} l 3 4 -2 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cmk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cmk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "栉坊", eyebrow: "PROVIDER COMBMAKER", render };
})();
