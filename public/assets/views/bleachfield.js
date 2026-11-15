/* ------------------------------------------------------------ bleachfield
 * Bleachfield view — a row of grass plots, one per provider.
 * Cloth pieces laid out = tokens; a worker turning cloth for live
 * sessions; a scorched patch marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bleachfield";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const grassY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bf-empty">暂无漂场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // grass field
    g += `<rect y="${grassY}" width="${W}" height="${H - grassY}" fill="var(--card-2)"/>`;
    for (let x = 8; x < W; x += 14) g += `<path d="M ${x} ${grassY} l 1.5 -4 l 1.5 4" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const plotW = seg * .7;
      const plotH = 24;
      const plotY = grassY - plotH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0f0e8" : "#c8c8b8";
      // plot — bounded grass area
      g += `<rect x="${x - plotW / 2}" y="${plotY}" width="${plotW}" height="${plotH}" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" opacity=".6"/>`;
      // cloth pieces — count by tokens, laid flat
      const pieces = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let p = 0; p < pieces; p++) {
        const px = x - plotW * .35 + (p % 3) * (plotW * .35);
        const py = plotY + 6 + Math.floor(p / 3) * 8;
        g += `<rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="12" height="5" fill="${tint}" opacity=".7" stroke="${r.err ? "var(--red)" : r.col}" stroke-width=".8" ${r.err && p === pieces - 1 ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      // worker turning cloth for live sessions
      if (r.live) {
        g += `<g class="bf-turner" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + plotW / 2 + 12} ${grassY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="0" x2="9" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // scorched patch on errors
      if (r.err) g += `<ellipse cx="${x - plotW * .2}" cy="${plotY + 12}" rx="6" ry="3" fill="var(--red)" opacity=".3"/>`;
      g += `<text x="${x}" y="${grassY + 18}" text-anchor="middle" class="bf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "漂场", eyebrow: "PROVIDER BLEACHFIELD", render };
})();
