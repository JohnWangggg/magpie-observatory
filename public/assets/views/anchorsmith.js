/* -------------------------------------------------------------- anchorsmith
 * Anchorsmith view — a row of anchor forges, one per provider.
 * Anchors stacked on the floor = tokens; a smith welding
 * a fluke for live sessions; a flawed crown marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "anchorsmith";
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
    if (!rows.length) { host.innerHTML = `<div class="ans-empty">暂无锚匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the forge floor — a beaten-earth yard
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const anvilY = floorY - 12;
      const iron = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#6a6a70" : "#3a3a40";
      // the forge — a brick hearth with a chimney
      g += `<rect x="${x - bW * .42}" y="${floorY - 4}" width="${bW * .2}" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .4}" y="${floorY - 24}" width="${bW * .16}" height="20" fill="${r.err ? "var(--red)" : "#5a3a2a"}" stroke="${r.col}" stroke-width=".8"/>`;
      // fire in the hearth
      g += `<path d="M ${x - bW * .36} ${floorY - 6} q -4 -8 0 -12 q 4 4 0 12 M ${x - bW * .32} ${floorY - 6} q -2 -6 0 -10 q 2 4 0 10" fill="#ff9a3a" opacity=".85"/>`;
      // chimney
      g += `<rect x="${x - bW * .4}" y="${floorY - 36}" width="${bW * .16}" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x - bW * .42}" y="${floorY - 38}" width="${bW * .2}" height="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // the anvil — a block on a stump
      g += `<rect x="${x - bW * .1}" y="${floorY - 4}" width="${bW * .2}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - bW * .06}" y="${floorY - 14}" width="${bW * .12}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // a horn on the anvil
      g += `<path d="M ${x + bW * .02} ${floorY - 8} l 8 -3 -2 6 z" fill="${iron}" stroke="${r.col}" stroke-width=".5"/>`;
      // anchors stacked — small anchors leaning, count by tokens
      const anchors = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let a = 0; a < anchors; a++) {
        const ax = x + bW * .24 + a * bW * .12;
        const ay = floorY - 4;
        g += `<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${ay - 16}" stroke="${a === 0 && r.err ? "var(--red)" : iron}" stroke-width="1.6"/>`;
        g += `<path d="M ${ax - 4} ${ay - 16} L ${ax + 4} ${ay - 16} L ${ax} ${ay - 20} Z" fill="${a === 0 && r.err ? "var(--red)" : iron}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${ax - 3} ${ay - 12} L ${ax + 3} ${ay - 12}" stroke="${a === 0 && r.err ? "var(--red)" : iron}" stroke-width=".7"/>`;
        g += `<path d="M ${ax - 4} ${ay - 4} Q ${ax} ${ay} ${ax + 4} ${ay - 4} L ${ax + 2} ${ay - 8} L ${ax - 2} ${ay - 8} Z" fill="${a === 0 && r.err ? "var(--red)" : iron}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a half-welded anchor on the anvil
      g += `<line x1="${x - bW * .06}" y1="${floorY - 14}" x2="${x + bW * .04}" y2="${floorY - 18}" stroke="${iron}" stroke-width="1.8"/>`;
      g += `<path d="M ${x + bW * .02} ${floorY - 16} l 5 -5 3 5 z" fill="${r.err ? "var(--red)" : iron}" stroke="${r.col}" stroke-width=".6"/>`;
      // tongs and a water trough
      g += `<line x1="${x + bW * .36}" y1="${floorY - 8}" x2="${x + bW * .4}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .28}" y="${floorY - 6}" width="${bW * .14}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // smith welding for live sessions — figure at the anvil
      if (r.live) {
        g += `<g class="ans-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .02} ${floorY - 28})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="12" stroke="${r.col}" stroke-width="1"/>
          <path d="M 11 12 l 4 -4" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // flawed crown — a cracked palm on errors
      if (r.err) g += `<path d="M ${x + bW * .32} ${floorY - 6} l -4 4 3 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="ans-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ans-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锚匠", eyebrow: "PROVIDER ANCHORSMITH", render };
})();
