/* --------------------------------------------------------------- lightship
 * Lightship view — a row of anchored light vessels, one per
 * provider. Beam intensity off the masthead lantern = tokens; a
 * keeper on the watch for live sessions; a doused lamp marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lightship";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .78;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ls-empty">暂无灯船</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sea
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="#1e3348" opacity=".6"/>`;
    for (let x = 0; x < W; x += 34) g += `<path d="M ${x} ${waterY + 7} q 9 -4 18 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const hullW = seg * .55;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0d060" : "#c0a040";
      // hull — red lightship with sheer
      g += `<path d="M ${x - hullW / 2} ${waterY} L ${x - hullW * .42} ${waterY + 12} L ${x + hullW * .42} ${waterY + 12} L ${x + hullW / 2} ${waterY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // anchor chain
      g += `<line x1="${x - hullW * .3}" y1="${waterY + 12}" x2="${x - hullW * .38}" y2="${waterY + 20}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // mast
      const mastTop = waterY - 40;
      g += `<line x1="${x}" y1="${waterY}" x2="${x}" y2="${mastTop}" stroke="${r.col}" stroke-width="1.8"/>`;
      // lantern at masthead — glow size by tokens
      const beam = 6 + (r.tok / maxTok) * 10;
      if (!r.err) {
        g += `<circle class="ls-lamp" cx="${x}" cy="${mastTop - 3}" r="${(beam / 2).toFixed(1)}" fill="${tint}" opacity=".8" style="animation-delay: ${(i * .3).toFixed(1)}s"/>`;
        // beam cone
        g += `<path d="M ${x} ${mastTop - 3} L ${x + hullW * .8} ${mastTop - 14} L ${x + hullW * .8} ${mastTop + 8} Z" fill="${tint}" opacity=".15"/>`;
      } else {
        g += `<circle cx="${x}" cy="${mastTop - 3}" r="4" fill="var(--bg)" stroke="var(--red)" stroke-width="1.4"/>`;
      }
      // keeper on watch for live sessions
      if (r.live) {
        g += `<g class="ls-keeper" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + hullW * .2} ${waterY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      g += `<text x="${x}" y="${waterY + 30}" text-anchor="middle" class="ls-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ls-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯船", eyebrow: "PROVIDER LIGHTSHIP", render };
})();
