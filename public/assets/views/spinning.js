/* ---------------------------------------------------------------- spinning
 * Spinning view — a row of spinning wheels, one per provider.
 * Thread wound on the bobbin = tokens; the wheel spins for live
 * sessions; a snapped drive band marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "spinning";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sp-empty">暂无纺车</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floorboards
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 28) g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wheelR = 20 + (r.tok / maxTok) * 14;
      const bobbinX = x + wheelR + 16;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // legs
      g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${floorY - wheelR * 1.4}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x - 8}" y1="${floorY}" x2="${x}" y2="${floorY - wheelR}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + 8}" y1="${floorY}" x2="${x}" y2="${floorY - wheelR}" stroke="${r.col}" stroke-width="1.4"/>`;
      // wheel
      const wheelY = floorY - wheelR * 1.4;
      g += `<circle class="${r.live ? "sp-wheel" : ""}" style="animation-delay: ${(i * .2).toFixed(1)}s" cx="${x}" cy="${wheelY}" r="${wheelR}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" ${r.err ? 'stroke-dasharray="5 3"' : ""}/>`;
      // spokes
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        g += `<line x1="${x}" y1="${wheelY}" x2="${(x + Math.cos(a) * wheelR * .9).toFixed(0)}" y2="${(wheelY + Math.sin(a) * wheelR * .9).toFixed(0)}" stroke="${r.col}" stroke-width=".9" opacity=".6"/>`;
      }
      // drive band to bobbin
      g += `<line x1="${x}" y1="${wheelY - wheelR}" x2="${bobbinX}" y2="${wheelY - 8}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" opacity=".7" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // bobbin — thread wrap count by tokens
      const wraps = Math.min(8, Math.ceil(r.tok / maxTok * 8));
      g += `<line x1="${bobbinX}" y1="${floorY - wheelR * .5}" x2="${bobbinX}" y2="${floorY - wheelR * .5 - 20}" stroke="${r.col}" stroke-width="2"/>`;
      for (let w = 0; w < wraps; w++) {
        g += `<ellipse cx="${bobbinX}" cy="${floorY - wheelR * .5 - 4 - w * 2.2}" rx="${3 + w * .5}" ry="${2 + w * .2}" fill="none" stroke="${tint}" stroke-width="1" opacity=".7"/>`;
      }
      // treadle
      g += `<rect x="${x - 10}" y="${floorY - 4}" width="20" height="4" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<text x="${x + wheelR / 2}" y="${floorY + 18}" text-anchor="middle" class="sp-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "纺车", eyebrow: "PROVIDER SPINNING", render };
})();
