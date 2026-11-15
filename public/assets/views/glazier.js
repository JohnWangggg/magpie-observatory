/* ------------------------------------------------------------------- glazier
 * Glazier view — a row of leaded windows, one per provider.
 * Coloured quarrels set in the lights = tokens; a glazier
 * soldering came for live sessions; a cracked pane marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glazier";
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
    if (!rows.length) { host.innerHTML = `<div class="gz-empty">暂无镶玻璃坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wW = seg * .4;
      const wTop = floorY - 56;
      const wBot = floorY - 10;
      // the window — arched head on a sill
      g += `<path d="M ${x - wW / 2} ${wBot} L ${x - wW / 2} ${wTop + 12} Q ${x} ${wTop - 8} ${x + wW / 2} ${wTop + 12} L ${x + wW / 2} ${wBot} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - wW * .58}" y1="${wBot}" x2="${x + wW * .58}" y2="${wBot}" stroke="${r.col}" stroke-width="2.2"/>`;
      // leaded quarrels — a diamond grid of panes
      const cols = 3, rowsN = 4;
      for (let rw = 0; rw < rowsN; rw++) {
        for (let cl = 0; cl < cols; cl++) {
          const px = x - wW * .3 + cl * wW * .3 + (rw % 2 ? wW * .15 : 0);
          const py = wTop + 14 + rw * (wBot - wTop - 20) / rowsN;
          const lit = (rw * cols + cl) < Math.ceil(r.tok / maxTok * rowsN * cols);
          const tint = r.err && rw === 0 && cl === 1 ? "var(--red)" : lit ? r.col : "#505860";
          g += `<path d="M ${px} ${py} l ${wW * .09} ${5} l -${wW * .09} ${5} l -${wW * .09} -5 z" fill="${tint}" opacity="${lit ? .85 : .35}" stroke="${r.col}" stroke-width=".5"/>`;
        }
      }
      // the saddle bar — horizontal support
      g += `<line x1="${x - wW * .44}" y1="${(wTop + wBot) / 2}" x2="${x + wW * .44}" y2="${(wTop + wBot) / 2}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      // a cut-glass table beside — sheet glass leaning
      g += `<rect x="${x + wW * .58}" y="${floorY - 16}" width="10" height="14" rx="1" fill="${r.col}" opacity=".3" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + wW * .58}" y1="${floorY - 9}" x2="${x + wW * .58 + 10}" y2="${floorY - 9}" stroke="${r.col}" stroke-width=".5"/>`;
      // a pot of putty
      g += `<circle cx="${x - wW * .56}" cy="${floorY - 5}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<ellipse cx="${x - wW * .56}" cy="${floorY - 7}" rx="3" ry="1.4" fill="#909890"/>`;
      // glazier soldering for live sessions
      if (r.live) {
        g += `<g class="gz-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - wW * .56} ${wTop + 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="12" y2="13" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="13" cy="14" r="1" fill="#f0a040"/>
        </g>`;
      }
      // cracked pane — a fracture across quarrels on errors
      if (r.err) g += `<path d="M ${x - wW * .15} ${wTop + 16} l 5 8 l -3 6 l 6 7" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gz-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gz-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "镶玻璃坊", eyebrow: "PROVIDER GLAZIER", render };
})();
