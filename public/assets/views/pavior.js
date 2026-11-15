/* ------------------------------------------------------------------- pavior
 * Pavior view — a row of paviors' pitches, one per provider.
 * Setts laid on the bed = tokens; a pavior ramming
 * for live sessions; a tilted sett marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pavior";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="pv-empty">暂无路段</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a sub-base
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .46;
      const stone = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#9898a8" : "#686878";

      // the pitch — an excavation with a laid edge
      const bedY = floorY - 6;
      // laid setts — a fan of stones, count by tokens
      const setts = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      const row = Math.ceil(setts / 3);
      for (let s = 0; s < setts; s++) {
        const sx = x - bW * .34 + (s % 3) * bW * .12;
        const sy = bedY - Math.floor(s / 3) * 9;
        const tilt = (s === setts - 1 && r.err) ? -8 : (s % 3 - 1) * 3;
        g += `<rect x="${sx}" y="${sy - 7}" width="${bW * .1}" height="7" rx="1"
          fill="${s === setts - 1 && r.err ? "var(--red)" : stone}" stroke="${r.col}" stroke-width=".5"
          transform="rotate(${tilt} ${sx + bW * .05} ${sy - 3.5})"/>`;
      }
      // string lines — guide rails for the rows
      g += `<line x1="${x - bW * .36}" y1="${bedY - row * 9 - 4}" x2="${x + bW * .02}" y2="${bedY - row * 9 - 4}" stroke="${r.col}" stroke-width=".4" stroke-dasharray="3 2"/>`;
      g += `<line x1="${x - bW * .36}" y1="${bedY - 11}" x2="${x + bW * .02}" y2="${bedY - 11}" stroke="${r.col}" stroke-width=".4" stroke-dasharray="3 2"/>`;
      // line pins — stakes at the ends
      g += `<rect x="${x - bW * .38}" y="${bedY - row * 9 - 10}" width="2.5" height="10" fill="${stone}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<rect x="${x + bW * .01}" y="${bedY - row * 9 - 10}" width="2.5" height="10" fill="${stone}" stroke="${r.col}" stroke-width=".4"/>`;

      // a sand heap — bedding material
      g += `<path d="M ${x + bW * .14} ${floorY} q ${bW * .07} -16 ${bW * .14} 0 z" fill="#c8b890" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .16}" y1="${floorY - 8}" x2="${x + bW * .22}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".4"/>`;

      // a sett cart — a barrow of stones
      g += `<circle cx="${x + bW * .38}" cy="${floorY - 4}" r="4" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x + bW * .32} ${floorY - 8} l ${bW * .1} 0 l -2 -6 h -${bW * .06} z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<rect x="${x + bW * .33 + s * 3}" y="${floorY - 16}" width="3" height="3" fill="${stone}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      g += `<line x1="${x + bW * .32}" y1="${floorY - 8}" x2="${x + bW * .28}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".8"/>`;

      // a maul — the heavy rammer
      g += `<line x1="${x - bW * .44}" y1="${floorY}" x2="${x - bW * .4}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .42}" y="${floorY - 15}" width="5" height="4" fill="${stone}" stroke="${r.col}" stroke-width=".5"/>`;

      // pavior ramming for live sessions — figure over the setts
      if (r.live) {
        g += `<g class="pv-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .06} ${bedY - row * 9 - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="8" y2="12" stroke="${r.col}" stroke-width="1"/>
          <rect x="7" y="12" width="4" height="4" fill="${stone}" stroke="${r.col}" stroke-width=".4"/>
        </g>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="pv-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铺路", eyebrow: "PROVIDER PAVIOR", render };
})();
