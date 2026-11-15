/* ----------------------------------------------------------------- limeburn
 * Limeburn view — a row of draw kilns, one per provider. Burnt
 * lime raked out at the eye = tokens; a burner charging stone
 * for live sessions; a vitrified wall marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "limeburn";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lb-empty">暂无石灰窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard ground
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8d0c0" : "#b0a890";
      const kilnW = seg * .5;
      const kilnH = 44;
      const kilnTop = yardY - kilnH;
      // the kiln — a stone pot with a draw eye at the foot
      g += `<path d="M ${x - kilnW / 2} ${yardY} L ${x - kilnW * .4} ${kilnTop} L ${x + kilnW * .4} ${kilnTop} L ${x + kilnW / 2} ${yardY} Z"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // draw eye — an arched mouth at the foot with embers
      g += `<path d="M ${x - 5} ${yardY} v -10 a 5 5 0 0 1 10 0 v 10 Z" fill="#402020" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${x}" cy="${yardY - 4}" r="2" fill="var(--amber)" opacity=".9"/>`;
      // charging mouth at top with stone bedded in
      g += `<ellipse cx="${x}" cy="${kilnTop}" rx="${kilnW * .32}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // burnt lime raked out — lumps in front, count by tokens
      const lumps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < lumps; l++) {
        g += `<circle cx="${x + kilnW * .4 + 4 + l * 6}" cy="${yardY - 3 - (l % 2) * 3}" r="3" fill="${tint}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // burner charging stone for live sessions
      if (r.live) {
        g += `<g class="lb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - kilnW * .4 - 6} ${kilnTop - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="8" cy="8" r="2" fill="${tint}"/>
        </g>`;
      }
      // vitrified wall — a glassy streak on errors
      if (r.err) g += `<path d="M ${x - kilnW * .3} ${kilnTop + 8} l 6 14" stroke="var(--red)" stroke-width="2" fill="none" opacity=".7"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="lb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石灰窑", eyebrow: "PROVIDER LIMEBURN", render };
})();
