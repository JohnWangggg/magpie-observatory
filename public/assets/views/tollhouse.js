/* --------------------------------------------------------------- tollhouse
 * Tollhouse view — a row of turnpike toll houses, one per provider.
 * Bell above the gate rings for tokens; a traveller at the window
 * for live sessions; a broken gate arm marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tollhouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const roadY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="th-empty">暂无收费亭</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // road
    g += `<rect y="${roadY}" width="${W}" height="${H - roadY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 30) g += `<rect x="${x}" y="${roadY + (H - roadY) / 2}" width="18" height="3" fill="var(--line)" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const houseW = seg * .5;
      const houseH = 44 + (r.tok / maxTok) * 20;
      const houseY = roadY - houseH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // cottage body
      g += `<rect x="${x - houseW / 2}" y="${houseY}" width="${houseW}" height="${houseH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // roof
      g += `<path d="M ${x - houseW / 2 - 4} ${houseY} L ${x} ${houseY - 14} L ${x + houseW / 2 + 4} ${houseY} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // toll window
      g += `<rect x="${x - 6}" y="${houseY + 8}" width="12" height="12" fill="var(--bg)" stroke="${r.col}" stroke-width="1.2"/>`;
      // gate arm across road — up for pass, broken on error
      const armLen = houseW * .9;
      const armY = roadY - 14;
      if (r.err) {
        g += `<line x1="${x - houseW / 2}" y1="${armY}" x2="${x - houseW / 2 + armLen * .5}" y2="${armY + 8}" stroke="var(--red)" stroke-width="2.4"/>`;
        g += `<line x1="${x - houseW / 2 + armLen * .5}" y1="${armY + 8}" x2="${x - houseW / 2 + armLen}" y2="${armY - 2}" stroke="var(--red)" stroke-width="2.4" stroke-dasharray="4 2"/>`;
      } else {
        g += `<line x1="${x - houseW / 2}" y1="${armY}" x2="${x - houseW / 2 + armLen}" y2="${armY - (r.live ? 10 : 0)}" stroke="${r.col}" stroke-width="2.4"/>`;
      }
      // bell above gate — swings with tokens
      const bellY = armY - 14 - (r.tok / maxTok) * 8;
      g += `<g class="${r.live ? "th-bell" : ""}" style="animation-delay: ${(i * .2).toFixed(1)}s">
        <line x1="${x}" y1="${armY}" x2="${x}" y2="${bellY}" stroke="${r.col}" stroke-width="1"/>
        <path d="M ${x - 4} ${bellY} Q ${x} ${bellY - 6} ${x + 4} ${bellY} L ${x + 4} ${bellY + 3} L ${x - 4} ${bellY + 3} Z" fill="${tint}"/>
      </g>`;
      // traveller at window for live sessions
      if (r.live) {
        g += `<circle cx="${x - 6}" cy="${houseY + 14}" r="3.5" fill="${r.col}" opacity=".8"/>`;
        g += `<rect x="${x - 9}" y="${houseY + 18}" width="6" height="8" rx="2" fill="${r.col}" opacity=".8"/>`;
      }
      g += `<text x="${x}" y="${roadY + 18}" text-anchor="middle" class="th-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="th-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "收费站", eyebrow: "PROVIDER TOLLHOUSE", render };
})();
