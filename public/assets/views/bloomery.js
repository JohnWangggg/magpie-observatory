/* ---------------------------------------------------------------- bloomery
 * Bloomery view — a row of low shaft furnaces, one per provider.
 * Bloom mass in the hearth = tokens; bellows pumping for live
 * sessions; a slagged hearth marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bloomery";
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
    if (!rows.length) { host.innerHTML = `<div class="bl-empty">暂无块炼炉</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const furnW = seg * .6;
      const furnH = 44;
      const furnY = groundY - furnH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0a050" : "#b07030";
      // furnace — tapered shaft with top opening
      g += `<path d="M ${x - furnW / 2} ${groundY} L ${x - furnW / 2 + 4} ${furnY + 12} L ${x - furnW * .2} ${furnY} L ${x + furnW * .2} ${furnY} L ${x + furnW / 2 - 4} ${furnY + 12} L ${x + furnW / 2} ${groundY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // tuyere — clay pipe into side
      g += `<rect x="${x - furnW / 2 - 6}" y="${groundY - 18}" width="8" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // bloom mass inside — size by tokens
      const bloomR = 4 + (r.tok / maxTok) * 5;
      g += `<ellipse cx="${x}" cy="${groundY - 16}" rx="${bloomR.toFixed(1)}" ry="${(bloomR * .6).toFixed(1)}" fill="${tint}" opacity=".7"/>`;
      // bellows — pumping for live sessions
      if (r.live) {
        g += `<g class="bl-bellows" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + furnW / 2 + 14} ${groundY - 14})">
          <ellipse rx="8" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="-8" y1="0" x2="8" y2="0" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // slagged hearth on errors — overflow at base
      if (r.err) g += `<path d="M ${x - furnW * .2} ${groundY - 4} q 4 6 8 0 q 4 -6 8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="bl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "块炼炉", eyebrow: "PROVIDER BLOOMERY", render };
})();
