/* ----------------------------------------------------------------- oarmaker
 * Oarmaker view — a row of oar benches, one per provider.
 * Oars racked on the rails = tokens; an oarmaker shaving
 * a loom for live sessions; a split blade marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oarmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="om-empty">暂无桨匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the bench — a low work floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const railY = floorY - 14;
      const oar = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the rack — two posts with rails
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .38}" y1="${railY}" x2="${x + bW * .32}" y2="${railY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .38}" y1="${railY - 8}" x2="${x + bW * .32}" y2="${railY - 8}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // oars racked — blades leaning on the rails, count by tokens
      const oars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let o = 0; o < oars; o++) {
        const ox = x - bW * .3 + o * bW * .16;
        g += `<line x1="${ox}" y1="${railY - 2}" x2="${ox + 8}" y2="${railY - 26}" stroke="${o === 0 && r.err ? "var(--red)" : oar}" stroke-width="2.2"/>`;
        // blade tip
        g += `<path d="M ${ox + 8} ${railY - 26} l 3 -4 2 6 z" fill="${o === 0 && r.err ? "var(--red)" : oar}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // an oar on the bench — a loom clamped for shaving
      g += `<rect x="${x - bW * .2}" y="${floorY - 8}" width="${bW * .4}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .16}" y1="${floorY - 8}" x2="${x - bW * .16}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .16}" y1="${floorY - 8}" x2="${x + bW * .16}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".6"/>`;
      // the blade end shaped
      g += `<path d="M ${x + bW * .18} ${floorY - 8} l 6 -3 -2 6 z" fill="${oar}" stroke="${r.col}" stroke-width=".5"/>`;
      // shavings — curls under the bench
      for (let sh = 0; sh < 3; sh++) {
        g += `<path d="M ${x - bW * .1 + sh * 8} ${floorY - 2} q 2 -3 4 -1" fill="none" stroke="${oar}" stroke-width=".6" opacity=".6"/>`;
      }
      // a spokeshave hanging
      g += `<line x1="${x + bW * .36}" y1="${floorY - 6}" x2="${x + bW * .4}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x + bW * .38} ${floorY - 14} l 4 -4" stroke="${r.col}" stroke-width=".7"/>`;
      // oarmaker shaving for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="om-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // split blade — a crack on the blade on errors
      if (r.err) g += `<path d="M ${x + bW * .2} ${floorY - 8} l 4 3" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="om-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="om-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "桨匠", eyebrow: "PROVIDER OARMAKER", render };
})();
