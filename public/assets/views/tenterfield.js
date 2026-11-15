/* ------------------------------------------------------------ tenterfield
 * Tenterfield view — a row of tenter frames, one per provider.
 * Cloth stretched on hooks = tokens; a dryer with a fan for live
 * sessions; a torn selvedge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tenterfield";
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
    if (!rows.length) { host.innerHTML = `<div class="tf-empty">暂无绷架</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // grass field
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 8; x < W; x += 18) g += `<path d="M ${x} ${groundY} l 2 -5 l 2 5" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const frameW = seg * .7;
      const frameH = 38;
      const frameY = groundY - frameH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8d0a0" : "#c0a878";
      // tenter frame — 2 posts + rails
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="6" height="${frameH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + frameW / 2 - 6}" y="${frameY}" width="6" height="${frameH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="${frameW}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x - frameW / 2}" y="${frameY + frameH - 4}" width="${frameW}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // cloth on hooks — width by tokens
      const clothW = frameW * .5 + (r.tok / maxTok) * frameW * .2;
      const clothX = x - clothW / 2;
      g += `<rect x="${clothX.toFixed(0)}" y="${frameY + 4}" width="${clothW.toFixed(0)}" height="${frameH - 8}" fill="${tint}" opacity=".5" ${r.err ? 'stroke="var(--red)" stroke-width="1" stroke-dasharray="3 2"' : `stroke="${r.col}" stroke-width="1"`}/>`;
      // tenter hooks along top edge
      const hooks = 5;
      for (let h = 0; h < hooks; h++) {
        const hx = clothX + (h + .5) * (clothW / hooks);
        g += `<path d="M ${hx.toFixed(0)} ${frameY + 4} l 0 -3 l 2 -1" stroke="${r.col}" stroke-width="1" fill="none"/>`;
      }
      // dryer with fan for live sessions
      if (r.live) {
        g += `<g class="tf-fan" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <circle cx="${x + frameW / 2 + 14}" cy="${frameY + 12}" r="7" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <path d="M ${x + frameW / 2 + 14} ${frameY + 12} l -5 -5 M ${x + frameW / 2 + 14} ${frameY + 12} l 5 5 M ${x + frameW / 2 + 14} ${frameY + 12} l -5 5 M ${x + frameW / 2 + 14} ${frameY + 12} l 5 -5" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn selvedge on errors
      if (r.err) g += `<path d="M ${clothX + clothW - 4} ${frameY + 8} l -4 4 l 4 4 l -4 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="tf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拉幅场", eyebrow: "PROVIDER TENTERFIELD", render };
})();
