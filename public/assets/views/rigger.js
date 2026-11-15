/* ------------------------------------------------------------------- rigger
 * Rigger view — a row of rigging lofts, one per provider.
 * Coiled lines on the racks = tokens; a rigger serving
 * a stay for live sessions; a frayed line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rigger";
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
    if (!rows.length) { host.innerHTML = `<div class="rgr-empty">暂无索具</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the loft — a plank floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const rackY = floorY - 18;
      const rope = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the rack — two posts with rails holding coiled lines
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .38}" y1="${rackY}" x2="${x + bW * .32}" y2="${rackY}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .38}" y1="${rackY - 8}" x2="${x + bW * .32}" y2="${rackY - 8}" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // coiled lines — loops hanging on the rails, count by tokens
      const coils = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < coils; c++) {
        const cx = x - bW * .3 + c * bW * .16;
        g += `<circle cx="${cx}" cy="${rackY - 12}" r="4.5" fill="none" stroke="${c === 0 && r.err ? "var(--red)" : rope}" stroke-width=".9"/>`;
        g += `<circle cx="${cx}" cy="${rackY - 12}" r="2" fill="none" stroke="${c === 0 && r.err ? "var(--red)" : rope}" stroke-width=".5"/>`;
        // a hanging tail
        g += `<line x1="${cx}" y1="${rackY - 8}" x2="${cx - 2}" y2="${rackY + 4}" stroke="${c === 0 && r.err ? "var(--red)" : rope}" stroke-width=".7"/>`;
      }
      // a serving mallet and a fid on the bench
      g += `<rect x="${x - bW * .2}" y="${floorY - 8}" width="${bW * .4}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .1}" y1="${floorY - 8}" x2="${x - bW * .1}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .1} ${floorY - 14} l -3 -4 6 0 z" fill="${rope}" stroke="${r.col}" stroke-width=".5"/>`;
      // a stay being served — a rope in a vice
      g += `<line x1="${x - bW * .14}" y1="${floorY - 8}" x2="${x + bW * .14}" y2="${floorY - 12}" stroke="${rope}" stroke-width="1.4"/>`;
      g += `<rect x="${x + bW * .04}" y="${floorY - 14}" width="${bW * .16}" height="4" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      // a deadeye hanging
      g += `<circle cx="${x + bW * .3}" cy="${rackY - 20}" r="3.2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .3 - 1}" cy="${rackY - 21}" r=".7" fill="${r.col}"/>`;
      g += `<circle cx="${x + bW * .3 + 1}" cy="${rackY - 21}" r=".7" fill="${r.col}"/>`;
      g += `<circle cx="${x + bW * .3}" cy="${rackY - 19}" r=".7" fill="${r.col}"/>`;
      // rigger serving for live sessions — figure at the vice
      if (r.live) {
        g += `<g class="rgr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .08} ${floorY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // frayed line — a loose end on errors
      if (r.err) g += `<path d="M ${x + bW * .24} ${rackY - 8} q 4 6 8 2" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="1.5 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="rgr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rgr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "索具", eyebrow: "PROVIDER RIGGER", render };
})();
