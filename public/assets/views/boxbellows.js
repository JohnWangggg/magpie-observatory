/* -------------------------------------------------------------- boxbellows
 * Box bellows view — a row of push-pull piston bellows, one per
 * provider. Piston travel = tokens; a pumper at the handle for
 * live sessions; a split valve marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "boxbellows";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bb-empty">暂无箱风箱</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const boxW = seg * .62;
      const boxH = 32;
      const boxTop = floorY - boxH - 8;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      // bellows body — rectangular box
      g += `<rect x="${x - boxW / 2}" y="${boxTop}" width="${boxW}" height="${boxH}" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // piston inside — position by tokens (pushed deeper when busier)
      const travel = (r.tok / maxTok) * (boxW - 20);
      const pistonX = x - boxW / 2 + 8 + travel;
      g += `<line x1="${pistonX.toFixed(0)}" y1="${boxTop + 3}" x2="${pistonX.toFixed(0)}" y2="${boxTop + boxH - 3}" stroke="${tint}" stroke-width="3" opacity=".85"/>`;
      // inlet flap on the piston face
      g += `<rect x="${(pistonX - 3).toFixed(0)}" y="${boxTop + boxH / 2 - 3}" width="5" height="6" rx="1" fill="${r.col}" opacity=".8"/>`;
      // handle rod out the right end
      g += `<line x1="${pistonX.toFixed(0)}" y1="${boxTop + boxH / 2}" x2="${x + boxW / 2 + 10}" y2="${boxTop + boxH / 2}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<circle cx="${x + boxW / 2 + 11}" cy="${boxTop + boxH / 2}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // air nozzle at the left end — blowing into a hearth
      g += `<line x1="${x - boxW / 2}" y1="${boxTop + boxH / 2}" x2="${x - boxW / 2 - 10}" y2="${boxTop + boxH / 2}" stroke="${r.col}" stroke-width="1.6"/>`;
      // hearth glow fed by the bellows
      g += `<circle cx="${x - boxW / 2 - 14}" cy="${boxTop + boxH / 2}" r="${(4 + r.tok / maxTok * 4).toFixed(0)}" fill="${tint}" opacity=".5"/>`;
      // pumper at the handle for live sessions
      if (r.live) {
        g += `<g class="bb-pumper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + boxW / 2 + 20} ${boxTop + boxH / 2 - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-10" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split valve — cracked seam on the box on errors
      if (r.err) g += `<path d="M ${x} ${boxTop + 4} l 4 8 l -4 8" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bb-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "箱风箱", eyebrow: "PROVIDER BOX BELLOWS", render };
})();
