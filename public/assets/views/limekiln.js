/* --------------------------------------------------------------- limekiln
 * Limekiln view — a row of clamp kilns, one per provider. Fire
 * glow in the eye = tokens; a draw at the arch for live sessions;
 * a slumped charge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "limekiln";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lk-empty">暂无石灰窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const kilnW = seg * .7;
      const kilnH = 52;
      const kilnY = groundY - kilnH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0a060" : "#c08040";
      // kiln body — bottle-shaped clamp kiln
      g += `<path d="M ${x - kilnW / 2} ${groundY} L ${x - kilnW / 2 + 4} ${kilnY + 10} Q ${x} ${kilnY - 6} ${x + kilnW / 2 - 4} ${kilnY + 10} L ${x + kilnW / 2} ${groundY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // eye at base — glow by tokens
      const eyeR = 5 + (r.tok / maxTok) * 6;
      const eyeY = groundY - 12;
      g += `<circle cx="${x}" cy="${eyeY}" r="${eyeR.toFixed(1)}" fill="${tint}" opacity=".7"/>`;
      g += `<circle cx="${x}" cy="${eyeY}" r="${(eyeR * .5).toFixed(1)}" fill="var(--bg)"/>`;
      // draw arch — opening at front for live sessions
      if (r.live) {
        g += `<g class="lk-draw" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x - kilnW * .2} ${groundY - 4} q ${kilnW * .2} -10 ${kilnW * .4} 0" stroke="${r.col}" stroke-width="1.6" fill="none"/>
          <rect x="${x - 4}" y="${groundY - 10}" width="8" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // charge layers — horizontal lines by burn
      const layers = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let l = 0; l < layers; l++) {
        const ly = kilnY + 14 + l * 8;
        g += `<line x1="${x - kilnW * .3}" y1="${ly.toFixed(0)}" x2="${x + kilnW * .3}" y2="${ly.toFixed(0)}" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      }
      // smoke from top for live
      if (r.live) {
        for (let s = 0; s < 3; s++) g += `<circle class="lk-smoke" cx="${x + s * 4 - 4}" cy="${kilnY - 10 - s * 6}" r="${2 + s}" fill="${r.col}" opacity=".3" style="animation-delay: ${(i * .3 + s * .1).toFixed(1)}s"/>`;
      }
      // slumped charge on errors — tilted layer
      if (r.err) g += `<rect x="${x - kilnW * .2}" y="${kilnY + 20}" width="12" height="6" fill="var(--red)" opacity=".4" transform="rotate(15 ${x} ${kilnY + 23})"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="lk-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石灰窑", eyebrow: "PROVIDER LIMEKILN", render };
})();
