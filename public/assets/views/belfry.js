/* ------------------------------------------------------------------ belfry
 * Belfry view — a row of bell towers, one per provider. Bell swing
 * = tokens; a ringer on the rope for live sessions; a cracked yoke
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "belfry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bf-empty">暂无钟塔</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<rect x="${x}" y="${groundY + 6}" width="12" height="4" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerH = 60 + (r.tok / maxTok) * 30;
      const towerW = seg * .34;
      const towerY = groundY - towerH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a848" : "#a08858";
      // tower shaft
      g += `<rect x="${x - towerW / 2}" y="${towerY}" width="${towerW}" height="${towerH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // belfry window — arched
      g += `<path d="M ${x - 8} ${towerY + 12} A 8 8 0 0 1 ${x + 8} ${towerY + 12} L ${x + 8} ${towerY + 26} L ${x - 8} ${towerY + 26} Z" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      // bell in window — swings with tokens
      const swing = (r.tok / maxTok) * 14;
      g += `<g class="${r.live ? "bf-bell" : ""}" style="animation-delay: ${(i * .2).toFixed(1)}s" transform="translate(${x} ${towerY + 18}) rotate(${swing.toFixed(0)})">
        <path d="M -6 0 Q -6 -8 0 -8 Q 6 -8 6 0 L 8 4 L -8 4 Z" fill="${tint}" stroke="${r.col}" stroke-width="1"/>
        <circle cx="0" cy="6" r="2" fill="${r.col}"/>
      </g>`;
      // spire
      g += `<path d="M ${x - towerW / 2 - 4} ${towerY} L ${x} ${towerY - 20} L ${x + towerW / 2 + 4} ${towerY} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // ringer on rope for live sessions
      if (r.live) {
        g += `<line x1="${x}" y1="${towerY + 26}" x2="${x}" y2="${towerY + 44}" stroke="${r.col}" stroke-width="1.2"/>`;
        g += `<circle cx="${x}" cy="${towerY + 46}" r="3" fill="${r.col}" opacity=".8"/>`;
      }
      // cracked yoke on errors
      if (r.err) g += `<path d="M ${x - 6} ${towerY + 8} L ${x + 3} ${towerY + 14} L ${x - 3} ${towerY + 20}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="bf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟塔", eyebrow: "PROVIDER BELFRY", render };
})();
