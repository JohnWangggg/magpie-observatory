/* --------------------------------------------------------------------- osier
 * Osier view — a row of basketry benches, one per provider.
 * Finished wickers stacked beside = tokens; a basketmaker
 * waling withies for live sessions; a sprung rim marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "osier";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="os-empty">暂无柳编坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const withy = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#806840";
      const bW = seg * .38;
      // the lap bench — a low plank on trestles
      g += `<rect x="${x - bW / 2}" y="${floorY - 14}" width="${bW}" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .4}" y1="${floorY - 9}" x2="${x - bW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + bW * .4}" y1="${floorY - 9}" x2="${x + bW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.1"/>`;
      // the half-finished basket on the bench — stakes + waling
      g += `<path d="M ${x - bW * .28} ${floorY - 14} L ${x - bW * .22} ${floorY - 26} L ${x + bW * .22} ${floorY - 26} L ${x + bW * .28} ${floorY - 14}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      for (let st = 0; st < 5; st++) {
        const sx = x - bW * .2 + st * bW * .1;
        g += `<line x1="${sx}" y1="${floorY - 26}" x2="${sx + (st - 2) * 1.2}" y2="${floorY - 32}" stroke="${st === 0 && r.err ? "var(--red)" : withy}" stroke-width=".9"/>`;
      }
      // waling bands — two horizontal weaves
      g += `<path d="M ${x - bW * .24} ${floorY - 19} q ${bW * .24} -3 ${bW * .48} 0" fill="none" stroke="${withy}" stroke-width="1"/>`;
      g += `<path d="M ${x - bW * .23} ${floorY - 23} q ${bW * .23} -3 ${bW * .46} 0" fill="none" stroke="${withy}" stroke-width="1"/>`;
      // a working withy being woven in
      g += `<path d="M ${x + bW * .24} ${floorY - 21} q 8 -2 10 -7" fill="none" stroke="${r.err ? "var(--red)" : withy}" stroke-width="1.2"/>`;
      // bundle of withies leaning beside
      for (let w = 0; w < 4; w++) {
        g += `<line x1="${x - bW * .62 + w * 2}" y1="${floorY}" x2="${x - bW * .58 + w * 2}" y2="${floorY - 30 - w * 2}" stroke="${withy}" stroke-width="1" opacity=".8"/>`;
      }
      g += `<line x1="${x - bW * .64}" y1="${floorY - 16}" x2="${x - bW * .52}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      // finished baskets — a stack beside, count by tokens
      const baskets = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < baskets; b++) {
        const by = floorY - 2 - b * 9;
        g += `<path d="M ${x + bW * .5} ${by - 6} l 2 -4 h 8 l 2 4 z" fill="${b === 0 && r.err ? "var(--red)" : withy}" stroke="${r.col}" stroke-width=".6" opacity=".9"/>`;
        g += `<path d="M ${x + bW * .5 + 4} ${by - 10} a 4 3 0 0 1 4 0" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // basketmaker waling for live sessions
      if (r.live) {
        g += `<g class="os-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .48} ${floorY - 32})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // sprung rim — a stake bent out on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${floorY - 28} q -4 -5 -6 -1" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="os-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="os-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "柳编坊", eyebrow: "PROVIDER OSIER", render };
})();
