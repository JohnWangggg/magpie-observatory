/* ---------------------------------------------------------------- overshot
 * Overshot view — a row of overshot waterwheels, one per provider.
 * Bucket fill on the rim = tokens; a launder pours for live
 * sessions; a cracked spoke marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "overshot";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const streamY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ov-empty">暂无水轮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stream
    g += `<rect y="${streamY}" width="${W}" height="${H - streamY}" fill="var(--card-2)" opacity=".5"/>`;
    for (let x = 0; x < W; x += 20) g += `<path d="M ${x} ${streamY + 8} q 10 -4 20 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wheelR = 24 + (r.tok / maxTok) * 18;
      const wheelY = streamY - wheelR * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08858" : "#786838";
      // support posts
      g += `<line x1="${x - wheelR * .7}" y1="${streamY}" x2="${x}" y2="${wheelY}" stroke="var(--line)" stroke-width="2"/>`;
      g += `<line x1="${x + wheelR * .7}" y1="${streamY}" x2="${x}" y2="${wheelY}" stroke="var(--line)" stroke-width="2"/>`;
      // wheel
      g += `<circle class="${r.live ? "ov-wheel" : ""}" style="animation-delay: ${(i * .2).toFixed(1)}s" cx="${x}" cy="${wheelY}" r="${wheelR}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2.2" ${r.err ? 'stroke-dasharray="6 3"' : ""}/>`;
      // spokes
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        g += `<line x1="${x}" y1="${wheelY}" x2="${(x + Math.cos(a) * wheelR * .9).toFixed(0)}" y2="${(wheelY + Math.sin(a) * wheelR * .9).toFixed(0)}" stroke="${r.col}" stroke-width=".9" opacity=".6"/>`;
      }
      // rim buckets — fill by tokens
      const buckets = Math.min(10, Math.ceil(r.tok / maxTok * 10));
      for (let b = 0; b < buckets; b++) {
        const a = (b / 10) * Math.PI * 2 - Math.PI / 2;
        const bx = x + Math.cos(a) * wheelR * .92;
        const by = wheelY + Math.sin(a) * wheelR * .92;
        g += `<rect x="${(bx - 3).toFixed(0)}" y="${(by - 2).toFixed(0)}" width="6" height="5" rx="1" fill="${tint}" opacity=".8"/>`;
      }
      // launder pouring for live sessions
      if (r.live) {
        g += `<g class="ov-launder" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x - wheelR - 14}" y1="${wheelY - wheelR * .5}" x2="${x - 4}" y2="${wheelY - wheelR * .2}" stroke="${r.col}" stroke-width="2"/>
          <path d="M ${x - 4} ${wheelY - wheelR * .2} q 2 6 0 10" stroke="${tint}" stroke-width="1.4" fill="none"/>
        </g>`;
      }
      g += `<text x="${x}" y="${streamY + 18}" text-anchor="middle" class="ov-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ov-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水轮", eyebrow: "PROVIDER OVERSHOT", render };
})();
