/* --------------------------------------------------------------- tidegauge
 * Tidegauge view — a row of tide staffs, one per provider.
 * Water at the gauge = tokens; a keeper reading the
 * scale for live sessions; a silted gauge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tidegauge";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const baseY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tg-empty">暂无潮位</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // harbour wall — stone line at the base
    g += `<rect y="${baseY}" width="${W}" height="${H - baseY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .44;
      const staffTop = baseY - 46;
      const water = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a8ea8" : "#3a5a6c";
      // the tide staff — a graduated pole fixed to the wall
      g += `<rect x="${x - bW * .1}" y="${staffTop}" width="${bW * .2}" height="${baseY - staffTop}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // scale ticks — alternating marks
      for (let t = 0; t < 6; t++) {
        const ty = staffTop + 4 + t * 7;
        const tw = t % 2 ? 4 : 6;
        g += `<line x1="${x - bW * .1}" y1="${ty}" x2="${x - bW * .1 + tw}" y2="${ty}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // a board head at the top
      g += `<rect x="${x - bW * .16}" y="${staffTop - 6}" width="${bW * .32}" height="6" rx="1" fill="${r.err ? "var(--red)" : water}" stroke="${r.col}" stroke-width=".8"/>`;
      // water inside a gauge glass — level by tokens
      const lvl = 4 + (r.tok / maxTok) * (baseY - staffTop - 12);
      g += `<rect x="${x - bW * .06}" y="${baseY - lvl}" width="${bW * .12}" height="${lvl}" fill="${r.err ? "var(--red)" : water}" opacity=".55"/>`;
      // a float on the water
      g += `<circle cx="${x}" cy="${baseY - lvl}" r="2.6" fill="${r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".8"/>`;
      // sea ripples around the staff base
      for (let wv = 0; wv < 2; wv++) {
        g += `<path d="M ${x - bW * .34 + wv * bW * .3} ${baseY - 4} q 8 -3 16 0" fill="none" stroke="${water}" stroke-width=".8" opacity=".6"/>`;
      }
      // a fixing bracket to the wall
      g += `<line x1="${x - bW * .1}" y1="${baseY - 10}" x2="${x - bW * .24}" y2="${baseY - 10}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - bW * .26}" y="${baseY - 12}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      // a reading lamp at the top
      g += `<circle cx="${x + bW * .16}" cy="${staffTop - 8}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .16}" y1="${staffTop - 8}" x2="${x + bW * .16}" y2="${staffTop - 2}" stroke="${r.col}" stroke-width=".6"/>`;
      // keeper reading for live sessions — figure at the staff
      if (r.live) {
        g += `<g class="tg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .3} ${baseY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="7" x2="-12" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // silted gauge — muck at the base on errors
      if (r.err) g += `<path d="M ${x - bW * .1} ${baseY - 4} q ${bW * .1} 6 ${bW * .2} 0" fill="var(--red)" opacity=".5"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="tg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潮位", eyebrow: "PROVIDER TIDEGAUGE", render };
})();
