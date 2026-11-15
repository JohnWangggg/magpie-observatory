/* ---------------------------------------------------------------- filature
 * Filature view — a row of reeling basins, one per provider. Cocoon
 * count floating in the basin = tokens; a reeler's thread runs up
 * for live sessions; a cracked basin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "filature";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fl-empty">暂无缫盆</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<line x1="${x}" y1="${benchY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const basinW = seg * .6;
      const basinH = 36;
      const basinY = benchY - basinH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#d0b868";
      // basin
      g += `<ellipse cx="${x}" cy="${basinY + basinH}" rx="${basinW / 2}" ry="${basinH * .3}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - basinW / 2}" y="${basinY}" width="${basinW}" height="${basinH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // water
      g += `<ellipse cx="${x}" cy="${basinY + 4}" rx="${basinW / 2 - 4}" ry="4" fill="${tint}" opacity=".3"/>`;
      // cocoons floating — count by tokens
      const cocos = Math.min(8, Math.ceil(r.tok / maxTok * 8));
      for (let c = 0; c < cocos; c++) {
        const cx = x - basinW * .35 + (c / (cocos - 1 || 1)) * basinW * .7;
        const cy = basinY + 4 + (c % 3) * 3;
        g += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="4" ry="3" fill="${tint}" opacity=".8" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // reeling thread up to overhead reel for live sessions
      if (r.live) {
        g += `<g class="fl-thread" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x}" y1="${basinY}" x2="${x + 8}" y2="${basinY - 30}" stroke="${r.col}" stroke-width=".9" opacity=".8"/>
          <circle cx="${x + 8}" cy="${basinY - 30}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="${x + 8}" y1="${basinY - 30}" x2="${x + 8}" y2="${basinY - 38}" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked basin on errors
      if (r.err) g += `<path d="M ${x - basinW * .2} ${basinY + basinH * .3} L ${x + basinW * .1} ${basinY + basinH * .6} L ${x - basinW * .05} ${basinY + basinH}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="fl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缫丝", eyebrow: "PROVIDER FILATURE", render };
})();
