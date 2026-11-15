/* ------------------------------------------------------------------ marquetry
 * Marquetry view — a row of veneer panels, one per provider.
 * Lozenges inlaid on the field = tokens; a marqueter cutting
 * on the chevalet for live sessions; a lifted leaf marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "marquetry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mq-empty">暂无镶嵌坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workroom floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b070" : "#b08850";
      const panelW = seg * .4;
      const panelY = floorY - 36;
      const panelH = 26;
      // the veneer panel — a diamond field on a stand
      g += `<rect x="${x - panelW / 2}" y="${panelY}" width="${panelW}" height="${panelH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - panelW / 2 + 4}" y1="${panelY + panelH}" x2="${x - panelW / 2 - 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + panelW / 2 - 4}" y1="${panelY + panelH}" x2="${x + panelW / 2 + 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // lozenges across the field — count by tokens
      const loz = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < loz; l++) {
        const lx = x - panelW * .3 + l * (panelW * .6 / loz);
        g += `<path d="M ${lx} ${panelY + panelH * .5} l 4 -5 l 4 5 l -4 5 z" fill="${l === 0 && r.err ? "var(--red)" : wood}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // a lifted leaf — one lozenge tilted on errors
      if (r.err) {
        g += `<path d="M ${x + panelW * .28} ${panelY + panelH * .5} l 4 -5 l 4 5 l -4 5 z" fill="var(--red)" stroke="var(--red)" stroke-width=".8" transform="rotate(18 ${x + panelW * .32} ${panelY + panelH * .5})"/>`;
      }
      // veneer packets stacked beside — leaves by tokens
      const packs = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < packs; p++) {
        g += `<rect x="${x + panelW / 2 + 4}" y="${floorY - 4 - p * 4}" width="12" height="3" fill="${wood}" stroke="${r.col}" stroke-width=".6" transform="rotate(3 ${x + panelW / 2 + 10} ${floorY})"/>`;
      }
      // marqueter at the chevalet for live sessions — a cutting donkey
      if (r.live) {
        g += `<g class="mq-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - panelW * .42} ${panelY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mq-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mq-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "镶嵌坊", eyebrow: "PROVIDER MARQUETRY", render };
})();
