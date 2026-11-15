/* ---------------------------------------------------------------- cloister
 * Cloister view — an arcade of pointed arches around a garth, one
 * per provider. Arch depth = tokens; a candle in the opening for live
 * sessions; a fallen voussoir marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cloister";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const garthY = H * 0.86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cl-empty">暂无回廊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // garth — grass strip
    g += `<rect y="${garthY}" width="${W}" height="${H - garthY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 16) g += `<path d="M ${x} ${garthY + 5} q 4 -8 8 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;
    // parapet line above arcade
    g += `<line y="24" x2="${W}" y2="24" stroke="var(--line)" stroke-width="1.6"/>`;

    const pad = 24, aw = (W - pad * (rows.length + 1)) / rows.length;
    rows.forEach((r, i) => {
      const px = pad + i * (aw + pad);
      const ax = px + aw / 2;
      const aH = garthY - 44;
      const springY = 24 + 26;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // arch opening — recessed depth
      const depth = 6 + (r.tok / maxTok) * 14;
      g += `<path d="M ${px} ${garthY} L ${px} ${springY} Q ${ax} ${springY - 24} ${px + aw} ${springY} L ${px + aw} ${garthY} Z" fill="#0d0a08" opacity=".9"/>`;
      // arch outline
      g += `<path d="M ${px} ${garthY} L ${px} ${springY} Q ${ax} ${springY - 24} ${px + aw} ${springY} L ${px + aw} ${garthY}" fill="none" stroke="${r.col}" stroke-width="1.6"/>`;
      // voussoirs — wedge marks on arch
      for (let v = 0; v < 7; v++) {
        const t = v / 6;
        const va = Math.PI - t * Math.PI;
        const vx = ax + Math.cos(va) * (aw / 2 - 2), vy = springY - Math.sin(va) * 24;
        g += `<line x1="${vx.toFixed(0)}" y1="${vy.toFixed(0)}" x2="${(ax + Math.cos(va) * (aw / 2 + 4)).toFixed(0)}" y2="${(springY - Math.sin(va) * (24 + 6)).toFixed(0)}" stroke="${tint}" stroke-width="1" opacity=".6"/>`;
      }
      // candle in the opening for live sessions
      if (r.live) {
        g += `<g class="cl-candle" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${ax - 1.5}" y="${garthY - 14}" width="3" height="10" fill="${r.col}" opacity=".9"/>
          <circle cx="${ax}" cy="${garthY - 18}" r="3" fill="${tint}"/>
        </g>`;
      }
      // fallen voussoir on errors
      if (r.err) {
        const fx = ax + aw / 2 - 8, fy = springY - 6;
        g += `<path d="M ${fx} ${fy} l 8 -4 l 4 6 l -8 4 Z" fill="var(--red)" opacity=".7"/>`;
      }
      g += `<text x="${ax}" y="${garthY + 20}" text-anchor="middle" class="cl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "回廊", eyebrow: "PROVIDER CLOISTER", render };
})();
