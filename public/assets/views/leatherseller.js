/* -------------------------------------------------------------- leatherseller
 * Leatherseller view — a row of leather stalls, one per provider.
 * Rolled hides on the stand = tokens; a seller measuring
 * a roll for live sessions; a flawed hide marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "leatherseller";
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
    if (!rows.length) { host.innerHTML = `<div class="lsl-empty">暂无皮商</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the stall — a raised floor with a counter
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const counterY = floorY - 14;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the stall — a counter with an awning
      g += `<rect x="${x - bW * .4}" y="${counterY}" width="${bW * .8}" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .4}" y1="${counterY}" x2="${x + bW * .4}" y2="${counterY}" stroke="${r.col}" stroke-width=".6"/>`;
      // awning — a striped canopy
      g += `<path d="M ${x - bW * .44} ${counterY - 16} L ${x - bW * .4} ${counterY - 4} L ${x + bW * .4} ${counterY - 4} L ${x + bW * .44} ${counterY - 16} Z" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
      // awning stripes
      for (let s = 0; s < 4; s++) {
        g += `<line x1="${x - bW * .4 + s * bW * .2}" y1="${counterY - 16}" x2="${x - bW * .36 + s * bW * .2}" y2="${counterY - 4}" stroke="${r.col}" stroke-width=".4" opacity=".6"/>`;
      }
      // rolled hides — bundles on the counter, count by tokens
      const rolls = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let ro = 0; ro < rolls; ro++) {
        const rx = x - bW * .3 + ro * bW * .16;
        g += `<ellipse cx="${rx}" cy="${counterY - 8}" rx="6" ry="4" fill="${ro === 0 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<ellipse cx="${rx}" cy="${counterY - 8}" rx="2.5" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a measuring stick — a yard wand on the counter
      g += `<line x1="${x - bW * .36}" y1="${counterY - 12}" x2="${x + bW * .36}" y2="${counterY - 12}" stroke="${r.col}" stroke-width=".8"/>`;
      for (let t = 0; t < 5; t++) {
        g += `<line x1="${x - bW * .36 + t * bW * .18}" y1="${counterY - 12}" x2="${x - bW * .36 + t * bW * .18}" y2="${counterY - 14}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a price board — a small sign
      g += `<rect x="${x + bW * .28}" y="${counterY - 24}" width="${bW * .18}" height="10" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .3}" y1="${counterY - 22}" x2="${x + bW * .42}" y2="${counterY - 22}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x + bW * .3}" y1="${counterY - 18}" x2="${x + bW * .4}" y2="${counterY - 18}" stroke="${r.col}" stroke-width=".4"/>`;
      // a hide draped over the counter edge
      g += `<path d="M ${x - bW * .1} ${counterY} q 4 6 0 12 q -4 -6 0 -12" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".6"/>`;
      // seller measuring for live sessions — figure at the counter
      if (r.live) {
        g += `<g class="lsl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${counterY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // flawed hide — a crack on the leather on errors
      if (r.err) g += `<path d="M ${x - bW * .3} ${counterY - 8} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="lsl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lsl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "皮商", eyebrow: "PROVIDER LEATHERSELLER", render };
})();
