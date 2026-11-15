/* ---------------------------------------------------------------- apothecary
 * Apothecary view — a row of medicine cupboards, one per provider.
 * Drug jars ranged on the shelves = tokens; an apothecary
 * weighing powders for live sessions; a cracked jar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "apothecary";
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
    if (!rows.length) { host.innerHTML = `<div class="ap-empty">暂无药房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tinct = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#58a080" : "#387058";
      const cW = seg * .4;
      const cTop = floorY - 50;
      // the cupboard — a dresser with two shelves
      g += `<rect x="${x - cW / 2}" y="${cTop}" width="${cW}" height="${floorY - cTop}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - cW / 2}" y1="${cTop + 16}" x2="${x + cW / 2}" y2="${cTop + 16}" stroke="${r.col}" stroke-width="1" opacity=".7"/>`;
      g += `<line x1="${x - cW / 2}" y1="${cTop + 32}" x2="${x + cW / 2}" y2="${cTop + 32}" stroke="${r.col}" stroke-width="1" opacity=".7"/>`;
      // drug jars — rows of albarello jars, count by tokens
      const jars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let j = 0; j < jars; j++) {
        g += `<path d="M ${x - cW * .38 + j * cW * .2} ${cTop + 6} a 4 4 0 0 1 8 0 v 7 h -8 z" fill="${j === 0 && r.err ? "var(--red)" : tinct}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<rect x="${x - cW * .38 + j * cW * .2 + 1.4}" y="${cTop + 8}" width="5.2" height="2.6" fill="#e8e0d0" opacity=".8"/>`;
      }
      // bottles on the middle shelf
      for (let b = 0; b < 3; b++) {
        g += `<path d="M ${x - cW * .34 + b * cW * .24} ${cTop + 24} v -4 l 1.5 -2 h 3 l 1.5 2 v 4 z" fill="${b === 0 && r.err ? "var(--red)" : r.col}" opacity=".7" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // mortar and pestle on the counter
      g += `<path d="M ${x - cW * .44} ${floorY - 12} q 5 8 10 0 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - cW * .44 + 6}" y1="${floorY - 14}" x2="${x - cW * .44 + 10}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1.2"/>`;
      // a balance scale on the counter
      g += `<line x1="${x + cW * .3}" y1="${floorY - 18}" x2="${x + cW * .3}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + cW * .22}" y1="${floorY - 16}" x2="${x + cW * .38}" y2="${floorY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x + cW * .22} ${floorY - 16} q 0 4 3 4 q 3 0 3 -4" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x + cW * .32} ${floorY - 16} q 0 4 3 4 q 3 0 3 -4" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // dried herbs hanging above
      g += `<line x1="${x - cW * .1}" y1="${cTop - 6}" x2="${x + cW * .3}" y2="${cTop - 6}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      g += `<path d="M ${x + cW * .05} ${cTop - 6} q -2 6 0 9" fill="none" stroke="${tinct}" stroke-width="1.1"/>`;
      g += `<path d="M ${x + cW * .18} ${cTop - 6} q 2 6 0 9" fill="none" stroke="${tinct}" stroke-width="1.1"/>`;
      // apothecary weighing for live sessions
      if (r.live) {
        g += `<g class="ap-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - cW * .68} ${cTop + 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked jar — a split albarello on errors
      if (r.err) g += `<path d="M ${x - cW * .36} ${cTop + 8} l 4 3 l -2 4" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ap-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ap-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "药房", eyebrow: "PROVIDER APOTHECARY", render };
})();
