/* ----------------------------------------------------------------- starchery
 * Starchery view — a row of starching vats, one per provider.
 * Starched cloth lengths on the drying frame = tokens; a worker
 * wringing for live sessions; a mouldering bolt marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "starchery";
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
    if (!rows.length) { host.innerHTML = `<div class="sth-empty">暂无浆纱坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // damp floor with a drain channel
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY + 4}" x2="${W}" y2="${floorY + 4}" stroke="var(--line)" stroke-width="1" opacity=".5" stroke-dasharray="6 4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const cloth = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8e4d8" : "#b0a890";
      const vW = seg * .36;
      const vY = floorY - 26;
      const vH = 22;
      // the starching vat — a deep wooden tub
      g += `<path d="M ${x - vW / 2} ${vY} L ${x - vW * .44} ${floorY - 2} L ${x + vW * .44} ${floorY - 2} L ${x + vW / 2} ${vY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // milky starch surface
      g += `<ellipse cx="${x}" cy="${vY + 4}" rx="${vW * .44}" ry="3.5" fill="#d8d0c0" opacity=".8"/>`;
      // stave lines
      for (let sv = -1; sv <= 1; sv++) g += `<line x1="${x + sv * vW * .17}" y1="${vY + 6}" x2="${x + sv * vW * .15}" y2="${floorY - 3}" stroke="${r.col}" stroke-width=".5" opacity=".5"/>`;
      // hoop
      g += `<path d="M ${x - vW * .47} ${vY + vH * .55} L ${x + vW * .47} ${vY + vH * .55}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // cloth being pulled from the vat — a sheet draping over the rim
      g += `<path d="M ${x - vW * .1} ${vY - 2} q 4 -6 8 -2 l -2 10 q -4 3 -7 -1 z" fill="${cloth}" stroke="${r.col}" stroke-width=".7"/>`;
      // drying frame — a tent-shaped tenter behind, cloth lengths by tokens
      g += `<line x1="${x + vW * .55}" y1="${floorY}" x2="${x + vW * .72}" y2="${vY - 6}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + vW * .9}" y1="${floorY}" x2="${x + vW * .72}" y2="${vY - 6}" stroke="${r.col}" stroke-width="1.1"/>`;
      const bolts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bolts; b++) {
        g += `<path d="M ${x + vW * (.58 + b * .1)} ${vY - 2 + b * 2} l ${vW * .18} 0 l ${vW * .16} ${floorY - vY - 6} l -${vW * .18} 0 z" fill="${b === 0 && r.err ? "var(--red)" : cloth}" stroke="${r.col}" stroke-width=".6" opacity="${.9 - b * .15}"/>`;
      }
      // a bucket of blue rinse beside
      g += `<path d="M ${x - vW * .78} ${floorY - 8} l 1 8 h 6 l 1 -8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<ellipse cx="${x - vW * .78 + 4}" cy="${floorY - 8}" rx="4" ry="1.6" fill="#7888c8" opacity=".7"/>`;
      // worker wringing cloth for live sessions
      if (r.live) {
        g += `<g class="sth-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - vW * .58} ${vY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M 4 6 q 6 2 8 6" fill="none" stroke="${cloth}" stroke-width="1.4"/>
        </g>`;
      }
      // mouldering bolt — a stained cloth end on errors
      if (r.err) g += `<path d="M ${x + vW * .2} ${vY + 4} q 3 3 1 7" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sth-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sth-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浆纱坊", eyebrow: "PROVIDER STARCHERY", render };
})();
