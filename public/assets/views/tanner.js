/* ------------------------------------------------------------------- tanner
 * Tanner view — a row of tan yards, one per provider.
 * Hides steeping in the pits = tokens; a tanner raking
 * a hide for live sessions; a scalded hide marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tanner";
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
    if (!rows.length) { host.innerHTML = `<div class="tnr-empty">暂无皮坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the tan yard — a plank floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const pitY = floorY - 8;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the tan pit — a stone-walled tank with liquor
      g += `<rect x="${x - bW * .38}" y="${pitY - 14}" width="${bW * .4}" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - bW * .36}" y="${pitY - 12}" width="${bW * .36}" height="10" fill="${r.err ? "var(--red)" : "#6a5a2a"}" stroke="${r.col}" stroke-width=".6" opacity=".7"/>`;
      // hides steeping — shapes in the liquor, count by tokens
      const hides = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < hides; h++) {
        const hx = x - bW * .3 + h * bW * .12;
        g += `<path d="M ${hx} ${pitY - 10} q 5 4 10 0 q -5 -4 -10 0" fill="${h === 0 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a rake and a pole leaning in
      g += `<line x1="${x - bW * .1}" y1="${pitY - 4}" x2="${x - bW * .16}" y2="${pitY - 18}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x - bW * .16} ${pitY - 18} l -4 -4 2 5 z" fill="${hide}" stroke="${r.col}" stroke-width=".5"/>`;
      // a drying rack with a stretched hide
      g += `<rect x="${x + bW * .08}" y="${pitY - 26}" width="${bW * .3}" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .08}" y1="${pitY - 26}" x2="${x + bW * .08}" y2="${pitY - 32}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .38}" y1="${pitY - 26}" x2="${x + bW * .38}" y2="${pitY - 32}" stroke="${r.col}" stroke-width=".7"/>`;
      // the hide on the rack — a stretched skin shape
      g += `<path d="M ${x + bW * .12} ${pitY - 30} q 6 -4 12 0 q 6 4 12 0 l 0 12 q -6 4 -12 0 q -6 -4 -12 0 z" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
      // lacing marks
      g += `<line x1="${x + bW * .16}" y1="${pitY - 26}" x2="${x + bW * .16}" y2="${pitY - 22}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .3}" y1="${pitY - 26}" x2="${x + bW * .3}" y2="${pitY - 22}" stroke="${r.col}" stroke-width=".4"/>`;
      // a bark pile beside
      g += `<ellipse cx="${x - bW * .42}" cy="${floorY - 4}" rx="10" ry="4" fill="#5a4a2a" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<path d="M ${x - bW * .46} ${floorY - 6} q 4 -6 8 -2" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // tanner raking for live sessions — figure at the pit
      if (r.live) {
        g += `<g class="tnr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .22} ${pitY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scalded hide — a bubble burst on errors
      if (r.err) g += `<circle cx="${x - bW * .3}" cy="${pitY - 8}" r="2" fill="var(--red)" opacity=".6"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tnr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tnr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "皮坊", eyebrow: "PROVIDER TANNER", render };
})();
