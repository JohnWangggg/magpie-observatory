/* -------------------------------------------------------------- mailcoach
 * Mailcoach view — a row of stagecoaches at the inn yard, one per
 * provider. Mailbags on the roof = tokens; a postilion mounting
 * for live sessions; a shed wheel marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mailcoach";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mc-empty">暂无驿马车</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // inn yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const coachW = seg * .6;
      const coachH = 26;
      const coachY = yardY - coachH - 8;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b060" : "#a08040";
      // coach body — rounded rectangle on springs
      g += `<rect x="${x - coachW / 2}" y="${coachY}" width="${coachW}" height="${coachH}" rx="6" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // window
      g += `<rect x="${x - 8}" y="${coachY + 6}" width="16" height="10" rx="2" fill="var(--bg)" stroke="${r.col}" stroke-width="1"/>`;
      // wheels — front smaller, rear larger
      g += `<circle cx="${x - coachW * .3}" cy="${yardY - 6}" r="9" fill="none" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<circle cx="${x - coachW * .3}" cy="${yardY - 6}" r="2" fill="${r.col}"/>`;
      g += `<circle cx="${x + coachW * .3}" cy="${yardY - 8}" r="12" fill="none" stroke="${r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<circle cx="${x + coachW * .3}" cy="${yardY - 8}" r="2.5" fill="${r.col}"/>`;
      // mailbags on the roof — count by tokens
      const bags = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bags; b++) {
        const bx = x - coachW * .3 + b * (coachW * .6 / (bags - 1 || 1));
        g += `<ellipse cx="${bx.toFixed(0)}" cy="${coachY - 4}" rx="6" ry="4" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // postilion mounting for live sessions
      if (r.live) {
        g += `<g class="mc-post" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + coachW / 2 + 10} ${coachY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // shed wheel on errors — wheel lying flat
      if (r.err) g += `<ellipse cx="${x - coachW * .45}" cy="${yardY - 2}" rx="8" ry="3" fill="none" stroke="var(--red)" stroke-width="1.6"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="mc-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "驿马车", eyebrow: "PROVIDER MAILCOACH", render };
})();
