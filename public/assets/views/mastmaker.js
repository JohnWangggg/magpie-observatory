/* --------------------------------------------------------------- mastmaker
 * Mastmaker view — a row of spar yards, one per provider.
 * Spars stacked on the horses = tokens; a mastmaker
 * dressing a mast for live sessions; a checked
 * spar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mastmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="msm-empty">暂无桅匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the yard — a timber-strewn floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const horseY = floorY - 12;
      const spar = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the horses — trestles supporting the spars
      for (let h = 0; h < 3; h++) {
        const hx = x - bW * .32 + h * bW * .32;
        g += `<line x1="${hx - 4}" y1="${floorY}" x2="${hx}" y2="${horseY}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<line x1="${hx + 4}" y1="${floorY}" x2="${hx}" y2="${horseY}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<line x1="${hx - 4}" y1="${horseY}" x2="${hx + 4}" y2="${horseY}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // spars stacked — long poles laid on the horses, count by tokens
      const spars = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < spars; s++) {
        const sy = horseY - 4 - s * 4;
        g += `<line x1="${x - bW * .4}" y1="${sy}" x2="${x + bW * .4}" y2="${sy}" stroke="${s === 0 && r.err ? "var(--red)" : spar}" stroke-width="2.4"/>`;
        // a slight taper — thinner at the right
        g += `<line x1="${x + bW * .36}" y1="${sy}" x2="${x + bW * .44}" y2="${sy}" stroke="${s === 0 && r.err ? "var(--red)" : spar}" stroke-width="1.2" opacity=".7"/>`;
      }
      // a mast being dressed — one spar on a cradle with a band
      g += `<rect x="${x - bW * .2}" y="${horseY - 26}" width="${bW * .4}" height="6" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .18}" y1="${horseY - 26}" x2="${x - bW * .18}" y2="${horseY - 32}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .18}" y1="${horseY - 26}" x2="${x + bW * .18}" y2="${horseY - 32}" stroke="${r.col}" stroke-width=".6"/>`;
      // hoops and bands on the mast
      g += `<rect x="${x - bW * .08}" y="${horseY - 32}" width="4" height="12" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .04}" y="${horseY - 32}" width="4" height="12" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // a drawknife and mallet beside
      g += `<line x1="${x + bW * .32}" y1="${floorY - 6}" x2="${x + bW * .36}" y2="${floorY - 14}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x + bW * .34} ${floorY - 14} l 4 -4" stroke="${r.col}" stroke-width=".7"/>`;
      // mastmaker dressing for live sessions — figure at the cradle
      if (r.live) {
        g += `<g class="msm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${horseY - 44})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // checked spar — a split end on errors
      if (r.err) g += `<path d="M ${x + bW * .38} ${horseY - 6} l 6 4" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="msm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="msm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "桅匠", eyebrow: "PROVIDER MASTMAKER", render };
})();
