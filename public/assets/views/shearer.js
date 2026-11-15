/* ------------------------------------------------------------------ shearer
 * Shearer view — a row of shearing pens, one per provider.
 * Fleeces folded on the board = tokens; a shearer clipping
 * for live sessions; a nicked sheep marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shearer";
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
    if (!rows.length) { host.innerHTML = `<div class="shr-empty">暂无剪棚</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wool = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8cdb8" : "#a89878";

      // the pen — a board floor with rails
      g += `<rect x="${x - bW * .4}" y="${floorY - 10}" width="${bW * .8}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      for (let s = 0; s < 4; s++) {
        g += `<line x1="${x - bW * .38 + s * bW * .24}" y1="${floorY - 10}" x2="${x - bW * .38 + s * bW * .24}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a sheep being shorn — held between legs
      const shy = floorY - 10;
      g += `<ellipse cx="${x - bW * .1}" cy="${shy - 6}" rx="9" ry="6" fill="${wool}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x - bW * .2}" cy="${shy - 8}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .13}" y1="${shy}" x2="${x - bW * .13}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .06}" y1="${shy}" x2="${x - bW * .06}" y2="${floorY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      // shears — a blade near the wool
      g += `<path d="M ${x - bW * .02} ${shy - 10} l 6 -3 -1 4 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .02}" cy="${shy - 7}" r=".8" fill="${r.col}"/>`;
      // a falling lock — wool coming off
      g += `<path d="M ${x - bW * .14} ${shy - 2} q 3 4 6 0 q -3 -3 -6 0" fill="${wool}" stroke="${r.col}" stroke-width=".4"/>`;

      // folded fleeces — a pile on the board, count by tokens
      const fleeces = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let f = 0; f < fleeces; f++) {
        const fx = x + bW * .1 + (f % 2) * bW * .14;
        const fy = floorY - 8 - Math.floor(f / 2) * 5;
        g += `<rect x="${fx}" y="${fy - 4}" width="${bW * .12}" height="4" rx="2"
          fill="${f === fleeces - 1 && r.err ? "var(--red)" : wool}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a wool pack — a big sack on a frame
      g += `<path d="M ${x + bW * .4} ${floorY} l -4 -18 h 12 l -4 18 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x + bW * .4} ${floorY - 18} l -2 -4 h 8 l -2 4 z" fill="${wool}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .36}" y1="${floorY - 18}" x2="${x + bW * .36}" y2="${floorY - 24}" stroke="${r.col}" stroke-width=".5"/>`;
      // a tally stick — counting shorn sheep
      g += `<rect x="${x - bW * .4}" y="${floorY - 20}" width="3" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x - bW * .4}" y1="${floorY - 18 + t * 3}" x2="${x - bW * .37}" y2="${floorY - 18 + t * 3}" stroke="${r.col}" stroke-width=".5"/>`;
      }

      // shearer clipping for live sessions — figure over the sheep
      if (r.live) {
        g += `<g class="shr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .02} ${shy - 22})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // nicked sheep — a red mark on errors
      if (r.err) g += `<line x1="${x - bW * .12}" y1="${shy - 8}" x2="${x - bW * .08}" y2="${shy - 4}" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="shr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="shr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "剪棚", eyebrow: "PROVIDER SHEARER", render };
})();
