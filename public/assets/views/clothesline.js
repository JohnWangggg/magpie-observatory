/* ------------------------------------------------------------- clothesline
 * Clothesline view — a row of drying lines, one per provider.
 * Garments on the line = tokens; a wind gust lifts for live
 * sessions; a snapped line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "clothesline";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cl-empty">暂无晾衣绳</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<ellipse cx="${x + 10}" cy="${groundY + 10}" rx="4" ry="2" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const lineW = seg * .8;
      const lineY = groundY - 48;
      const sag = 4 + (r.tok / maxTok) * 10;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // posts
      g += `<line x1="${x - lineW / 2}" y1="${groundY}" x2="${x - lineW / 2}" y2="${lineY}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${x + lineW / 2}" y1="${groundY}" x2="${x + lineW / 2}" y2="${lineY}" stroke="${r.col}" stroke-width="2.4"/>`;
      // line — sags with garments
      g += `<path d="M ${x - lineW / 2} ${lineY} Q ${x} ${lineY + sag} ${x + lineW / 2} ${lineY}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 2"' : ""}/>`;
      // garments — count by tokens
      const garments = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let gm = 0; gm < garments; gm++) {
        const t = (gm + 1) / (garments + 1);
        const gx = x - lineW / 2 + t * lineW;
        const gy = lineY + Math.sin(t * Math.PI) * sag;
        const gh = 12 + (gm % 3) * 4;
        g += `<rect x="${(gx - 4).toFixed(0)}" y="${gy.toFixed(0)}" width="8" height="${gh}" rx="1" fill="${tint}" opacity=".8" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${(gx - 4).toFixed(0)}" y1="${(gy + 2).toFixed(0)}" x2="${(gx + 4).toFixed(0)}" y2="${(gy + 2).toFixed(0)}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // wind gust for live sessions — swirl
      if (r.live) {
        g += `<g class="cl-gust" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x - lineW * .3} ${lineY - 10} q 8 -6 14 0 q -6 6 -14 0" stroke="${r.col}" stroke-width="1" fill="none" opacity=".7"/>
          <path d="M ${x + lineW * .15} ${lineY - 14} q 10 -8 18 0" stroke="${r.col}" stroke-width="1" fill="none" opacity=".5"/>
        </g>`;
      }
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="cl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "晾衣绳", eyebrow: "PROVIDER CLOTHESLINE", render };
})();
