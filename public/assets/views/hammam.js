/* ------------------------------------------------------------------ hammam
 * Hammam view — a row of domed bathing pools, one per provider.
 * Steam wisps rising from the pool = tokens; a towel on the rim for
 * live sessions; a cracked dome marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hammam";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="hm-empty">暂无浴池</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // tiled floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 18) for (let y = floorY; y < H; y += 18) g += `<rect x="${x}" y="${y}" width="14" height="14" fill="none" stroke="var(--line)" stroke-width=".5" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const poolR = seg * .32;
      const domeH = poolR * 1.1;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // dome
      g += `<path d="M ${x - poolR - 8} ${floorY} A ${poolR + 8} ${domeH} 0 0 1 ${x + poolR + 8} ${floorY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // oculus at dome apex
      g += `<circle cx="${x}" cy="${floorY - domeH + 6}" r="4" fill="var(--bg)" stroke="${r.col}" stroke-width="1"/>`;
      // pool basin cut into dome base
      g += `<ellipse cx="${x}" cy="${floorY}" rx="${poolR * .8}" ry="${poolR * .28}" fill="${tint}" opacity=".45" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<ellipse cx="${x}" cy="${floorY - 2}" rx="${poolR * .8}" ry="${poolR * .28}" fill="none" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // steam wisps — count by tokens
      const wisps = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let s = 0; s < wisps; s++) {
        const sx = x - poolR * .5 + (s / (wisps - 1 || 1)) * poolR;
        const sy = floorY - poolR * .2 - s * 6;
        g += `<path class="hm-wisp" style="animation-delay: ${(i * .3 + s * .2).toFixed(1)}s" d="M ${sx.toFixed(0)} ${sy.toFixed(0)} q 4 -8 0 -14 q -4 -6 0 -12" stroke="${tint}" stroke-width="1.2" fill="none" opacity="${(.9 - s * .15).toFixed(1)}"/>`;
      }
      // towel on rim for live sessions
      if (r.live) {
        g += `<g class="hm-towel" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - poolR * .7}" y="${floorY - poolR * .3 - 4}" width="12" height="5" rx="1.5" fill="${r.col}" opacity=".8"/>
          <rect x="${x - poolR * .7 + 2}" y="${floorY - poolR * .3 - 2}" width="8" height="2" fill="var(--card)"/>
        </g>`;
      }
      // cracked dome on errors
      if (r.err) g += `<path d="M ${x - 6} ${floorY - domeH * .6} L ${x + 4} ${floorY - domeH * .3} L ${x - 2} ${floorY - domeH * .1}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hm-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浴场", eyebrow: "PROVIDER HAMMAM", render };
})();
