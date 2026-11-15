/* --------------------------------------------------------------- puddling
 * Puddling view — a row of reverberatory furnaces, one per
 * provider. Puddle balls on the hearth = tokens; the puddler's
 * rabble stirring for live sessions; a chilled ball marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "puddling";
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
    if (!rows.length) { host.innerHTML = `<div class="pu-empty">暂无搅炼炉</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const furnW = seg * .62;
      const furnH = 42;
      const furnY = floorY - furnH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0a050" : "#c07030";
      // reverberatory furnace — arched body + flue stack
      g += `<path d="M ${x - furnW / 2} ${floorY} L ${x - furnW / 2} ${furnY + 10} Q ${x} ${furnY - 6} ${x + furnW / 2} ${furnY + 10} L ${x + furnW / 2} ${floorY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<rect x="${x + furnW / 2 - 8}" y="${furnY - 14}" width="8" height="20" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // fire door + hearth glow
      g += `<rect x="${x - 10}" y="${floorY - 18}" width="20" height="14" rx="2" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - 8}" y="${floorY - 16}" width="16" height="10" fill="${tint}" opacity=".5"/>`;
      // puddle balls in the hearth — count by tokens
      const balls = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < balls; b++) {
        const bx = x - 6 + b * 4;
        g += `<circle cx="${bx.toFixed(0)}" cy="${floorY - 10}" r="3" fill="${tint}" stroke="${r.col}" stroke-width=".8" ${r.err && b === 0 ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      // rabble through the door for live sessions
      if (r.live) {
        g += `<g class="pu-rabble" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x - 22}" y1="${floorY - 12}" x2="${x - 4}" y2="${floorY - 12}" stroke="${r.col}" stroke-width="1.6"/>
          <circle cx="${x - 24}" cy="${floorY - 12}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // chilled ball on errors — dark lump outside the door
      if (r.err) g += `<circle cx="${x - furnW * .3}" cy="${floorY - 4}" r="5" fill="var(--red)" opacity=".4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pu-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "搅炼炉", eyebrow: "PROVIDER PUDDLING", render };
})();
