/* ------------------------------------------------------------- organbuilder
 * Organbuilder view — a row of pipe shops, one per provider.
 * Voiced pipes racked by rank = tokens; a voicer at the toe
 * board for live sessions; a dented pipe marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "organbuilder";
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
    if (!rows.length) { host.innerHTML = `<div class="obn-empty">暂无管风琴坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tin = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8c0b0" : "#787060";
      const rW = seg * .4;
      const rTop = floorY - 52;
      // the pipe rack — a frame holding a rank of flue pipes
      g += `<line x1="${x - rW / 2}" y1="${floorY}" x2="${x - rW / 2}" y2="${rTop}" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x + rW / 2}" y1="${floorY}" x2="${x + rW / 2}" y2="${rTop}" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - rW * .52}" y1="${rTop + 14}" x2="${x + rW * .52}" y2="${rTop + 14}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - rW * .52}" y1="${rTop + 40}" x2="${x + rW * .52}" y2="${rTop + 40}" stroke="${r.col}" stroke-width="1"/>`;
      // the rank — pipes tall to short, count by tokens
      const pipes = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let p = 0; p < pipes; p++) {
        const px = x - rW * .4 + p * rW * .2;
        const ph = 26 - p * 5;
        g += `<rect x="${px}" y="${rTop + 40 - ph}" width="${rW * .09}" height="${ph}" rx="1.5" fill="${p === 0 && r.err ? "var(--red)" : tin}" stroke="${r.col}" stroke-width=".6"/>`;
        // mouth
        g += `<rect x="${px + 1}" y="${rTop + 36}" width="${rW * .09 - 2}" height="3" fill="var(--card-2)"/>`;
      }
      // the toe board — a bench below with pipe feet
      g += `<rect x="${x - rW * .46}" y="${rTop + 40}" width="${rW * .92}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // a reed pipe lying on the bench — conical shallot
      g += `<path d="M ${x - rW * .4} ${rTop + 44} l ${rW * .3} 0 l -2 -4 l -${rW * .26} 0 z" fill="${tin}" stroke="${r.col}" stroke-width=".6"/>`;
      // tuning cones and nicker tools beside
      g += `<path d="M ${x + rW * .5} ${rTop + 46} l 6 -8 l 2 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a bellows reservoir behind
      g += `<rect x="${x - rW * .68}" y="${floorY - 14}" width="14" height="8" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - rW * .68}" y1="${floorY - 10}" x2="${x - rW * .54}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;
      // voicer working for live sessions — figure with a tuning knife
      if (r.live) {
        g += `<g class="obn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - rW * .58} ${rTop + 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="13" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // dented pipe — a crushed tube on errors
      if (r.err) g += `<path d="M ${x - rW * .4} ${rTop + 20} l 6 -4 l -2 8" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="obn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="obn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "管风琴坊", eyebrow: "PROVIDER ORGANBUILDER", render };
})();
