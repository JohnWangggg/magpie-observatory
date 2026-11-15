/* ----------------------------------------------------------------- falconer
 * Falconer view — a row of mews blocks, one per provider.
 * Hawks on the perch = tokens; a falconer casting off
 * for live sessions; a bating hawk marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "falconer";
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
    if (!rows.length) { host.innerHTML = `<div class="fcn-empty">暂无鹰房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const feather = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a68" : "#5a4c40";

      // the block — a perching stump
      g += `<rect x="${x - bW * .3}" y="${floorY - 10}" width="${bW * .16}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<ellipse cx="${x - bW * .22}" cy="${floorY - 10}" rx="${bW * .08}" ry="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // the hawk — perched on the block
      const hawkY = floorY - 16;
      g += `<ellipse cx="${x - bW * .22}" cy="${hawkY}" rx="4" ry="5" fill="${feather}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x - bW * .23}" cy="${hawkY - 5}" r="2" fill="${feather}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .24} ${hawkY - 6} l -1.5 -1 .5 2 z" fill="#d8a040" stroke="${r.col}" stroke-width=".3"/>`;
      g += `<path d="M ${x - bW * .18} ${hawkY} q 4 3 5 8 l -3 -1 q -2 -4 -2 -7" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
      // hood — on the hawk's head
      g += `<path d="M ${x - bW * .25} ${hawkY - 7} q 1 -3 4 0 l 0 2 q -2 1 -4 -2 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // jesses — straps off the perch
      g += `<line x1="${x - bW * .24}" y1="${hawkY + 5}" x2="${x - bW * .26}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .2}" y1="${hawkY + 5}" x2="${x - bW * .18}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;

      // the gauntlet — a glove on a peg
      g += `<line x1="${x - bW * .02}" y1="${floorY - 30}" x2="${x - bW * .02}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - bW * .05} ${floorY - 30} q 3 -4 6 0 l -1 8 h -4 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a lure — a feathered swing
      g += `<line x1="${x + bW * .04}" y1="${floorY - 24}" x2="${x + bW * .04}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x + bW * .04} ${floorY - 24} q -3 -3 -5 -1 q 2 3 5 1 M ${x + bW * .04} ${floorY - 24} q 3 -3 5 -1 q -2 3 -5 1" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .04}" y1="${floorY - 24}" x2="${x + bW * .04}" y2="${floorY - 30}" stroke="${r.col}" stroke-width=".4"/>`;

      // a perch rail — more hawks, count by tokens
      g += `<line x1="${x + bW * .1}" y1="${floorY - 22}" x2="${x + bW * .42}" y2="${floorY - 22}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .1}" y1="${floorY - 22}" x2="${x + bW * .1}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .42}" y1="${floorY - 22}" x2="${x + bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      const hawks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < hawks; h++) {
        const hx = x + bW * .14 + h * bW * .12;
        g += `<ellipse cx="${hx}" cy="${floorY - 26}" rx="3" ry="4" fill="${h === hawks - 1 && r.err ? "var(--red)" : feather}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${hx - .5}" cy="${floorY - 30}" r="1.6" fill="${feather}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // mews — droppings tray under the rail
      g += `<rect x="${x + bW * .12}" y="${floorY - 2}" width="${bW * .28}" height="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;

      // falconer casting for live sessions — figure with raised glove
      if (r.live) {
        g += `<g class="fcn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .02} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="2" x2="10" y2="-4" stroke="${r.col}" stroke-width="1"/>
          <ellipse cx="11" cy="-6" rx="2" ry="3" fill="${feather}" stroke="${r.col}" stroke-width=".5"/>
        </g>`;
      }
      // bating hawk — flapping on errors
      if (r.err) g += `<path d="M ${x - bW * .22} ${hawkY - 4} q -5 -4 -7 0 M ${x - bW * .22} ${hawkY - 4} q 5 -4 7 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="fcn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fcn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鹰房", eyebrow: "PROVIDER FALCONER", render };
})();
