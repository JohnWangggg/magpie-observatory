/* ---------------------------------------------------------------- ropewalk
 * Ropewalk view — a long shed of rope strands, one lane per provider.
 * Twist marks on the strand = tokens; a spinning jenny turns for
 * live sessions; a snapped strand marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ropewalk";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const shedY = H * .2, shedH = H * .5;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="rw-empty">暂无绳廊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shed roof
    g += `<path d="M 0 ${shedY} L ${W / 2} ${shedY - 24} ${W} ${shedY} L ${W} ${shedY + 8} L 0 ${shedY + 8} Z" fill="var(--card-3)" stroke="var(--line)" stroke-width="1"/>`;
    // shed floor
    g += `<rect y="${shedY + shedH}" width="${W}" height="${H - shedY - shedH}" fill="var(--card-2)"/>`;

    const laneH = shedH / (rows.length + 1);
    rows.forEach((r, i) => {
      const y = shedY + 14 + laneH * (i + 1);
      const strandW = W * .72;
      const x0 = W * .14, x1 = x0 + strandW;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // strand — twisted line
      g += `<path d="M ${x0} ${y} Q ${x0 + strandW * .25} ${y - 4} ${x0 + strandW * .5} ${y} T ${x1} ${y}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2.4" ${r.err ? 'stroke-dasharray="6 3"' : ""}/>`;
      // twist marks — count by tokens
      const twists = Math.min(12, Math.ceil(r.tok / maxTok * 12));
      for (let t = 0; t < twists; t++) {
        const tx = x0 + (t / twists) * strandW;
        g += `<line x1="${tx.toFixed(0)}" y1="${y - 3}" x2="${(tx + 4).toFixed(0)}" y2="${y + 3}" stroke="${tint}" stroke-width="1.2" opacity=".7"/>`;
      }
      // spinning jenny at left end — turns for live
      g += `<circle class="${r.live ? "rw-jenny" : ""}" style="animation-delay: ${(i * .2).toFixed(1)}s" cx="${x0 - 10}" cy="${y}" r="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      if (r.live) g += `<line x1="${x0 - 10}" y1="${y - 5}" x2="${x0 - 10}" y2="${y + 5}" stroke="${r.col}" stroke-width="1"/>`;
      // bundle at right end
      g += `<rect x="${x1 + 4}" y="${y - 5}" width="10" height="10" rx="2" fill="${tint}" opacity=".6"/>`;
      g += `<text x="${x0 - 24}" y="${y + 3}" text-anchor="end" class="rw-lab">${esc(r.name.split("/").pop().slice(0, 6))}</text>`;
      g += `<text x="${x1 + 20}" y="${y + 3}" class="rw-lab">${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绳廊", eyebrow: "PROVIDER ROPEWALK", render };
})();
