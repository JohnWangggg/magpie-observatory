/* ----------------------------------------------------------------- forester
 * Forester view — a row of planted plots, one per provider.
 * Saplings set in rows = tokens; a forester planting
 * for live sessions; a withered whip marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "forester";
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
    if (!rows.length) { host.innerHTML = `<div class="ftr-empty">暂无林圃</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const leaf = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68a060" : "#3c6038";

      // sapling rows — planted whips, count by tokens
      const saplings = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let s = 0; s < saplings; s++) {
        const sx = x - bW * .4 + (s % 3) * bW * .16;
        const sy = floorY - Math.floor(s / 3) * 14;
        const tall = 10 + (s % 3) * 4;
        g += `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy - tall}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<circle cx="${sx}" cy="${sy - tall - 2}" r="2.4" fill="${s === saplings - 1 && r.err ? "var(--red)" : leaf}" stroke="${r.col}" stroke-width=".4"/>`;
        // a guard stake
        g += `<line x1="${sx + 3}" y1="${sy}" x2="${sx + 3}" y2="${sy - tall}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${sx}" y1="${sy - tall + 2}" x2="${sx + 3}" y2="${sy - tall + 2}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a mature tree — at the plot edge
      g += `<line x1="${x + bW * .38}" y1="${floorY}" x2="${x + bW * .38}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x + bW * .38}" cy="${floorY - 24}" r="7" fill="${leaf}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x + bW * .34}" cy="${floorY - 20}" r="5" fill="${leaf}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x + bW * .42}" cy="${floorY - 20}" r="5" fill="${leaf}" stroke="${r.col}" stroke-width=".5"/>`;
      // a spade — planted in the soil
      g += `<line x1="${x - bW * .42}" y1="${floorY - 12}" x2="${x - bW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - bW * .43} ${floorY} l 0 -4 q 1 -3 2 0 l 0 4 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a dibble — a planting stick
      g += `<line x1="${x + bW * .26}" y1="${floorY}" x2="${x + bW * .28}" y2="${floorY - 10}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x + bW * .28}" cy="${floorY - 11}" r="1.4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".4"/>`;
      // a bundle of whips — bare-root saplings
      g += `<path d="M ${x + bW * .44} ${floorY} l -2 -12 l 6 0 l -2 12 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<line x1="${x + bW * .45 + s}" y1="${floorY - 12}" x2="${x + bW * .45 + s}" y2="${floorY - 16}" stroke="${leaf}" stroke-width=".6"/>`;
      }

      // forester planting for live sessions — figure kneeling
      if (r.live) {
        g += `<g class="ftr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${floorY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1" transform="rotate(14)"/>
          <line x1="4" y1="8" x2="10" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // withered whip — a brown sapling on errors
      if (r.err) {
        const sx = x - bW * .4 + ((saplings - 1) % 3) * bW * .16;
        const sy = floorY - Math.floor((saplings - 1) / 3) * 14;
        g += `<circle cx="${sx}" cy="${sy - 14}" r="2.4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="ftr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ftr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "林圃", eyebrow: "PROVIDER FORESTER", render };
})();
