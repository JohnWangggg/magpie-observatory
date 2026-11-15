/* --------------------------------------------------------------------- dyer
 * Dyer view — a row of dye vats, one per provider.
 * Cloths steeping in the vat = tokens; a dyer stirring
 * for live sessions; a scorched cloth marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dyer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="dyr-empty">暂无染坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a stone surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const vatY = floorY - 10;
      const dye = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a4a8a" : "#3a2a50";
      // the vat — a round tub with liquor
      g += `<ellipse cx="${x}" cy="${vatY}" rx="${bW * .34}" ry="10" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x}" cy="${vatY - 4}" rx="${bW * .3}" ry="8" fill="${r.err ? "var(--red)" : dye}" stroke="${r.col}" stroke-width=".7" opacity=".7"/>`;
      // a fire under the vat — a small hearth
      g += `<rect x="${x - bW * .2}" y="${floorY - 4}" width="${bW * .4}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .1} ${floorY - 4} q -3 -8 0 -12 q 3 4 0 12 M ${x + bW * .1} ${floorY - 4} q -2 -6 0 -10 q 2 4 0 10" fill="#ff9a3a" opacity=".85"/>`;
      // cloths steeping — shapes in the liquor, count by tokens
      const cloths = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < cloths; c++) {
        const cx = x - bW * .2 + c * bW * .2;
        g += `<path d="M ${cx} ${vatY - 8} q 5 4 10 0 q -5 -4 -10 0" fill="${c === 0 && r.err ? "var(--red)" : "#c8b8d8"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a stick — a stirring pole leaning in
      g += `<line x1="${x + bW * .14}" y1="${vatY - 8}" x2="${x + bW * .2}" y2="${vatY - 22}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + bW * .2}" y1="${vatY - 22}" x2="${x + bW * .26}" y2="${vatY - 18}" stroke="${r.col}" stroke-width=".7"/>`;
      // a dipping rack — a frame with hung cloth
      g += `<rect x="${x + bW * .32}" y="${vatY - 30}" width="${bW * .14}" height="24" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .32}" y1="${vatY - 30}" x2="${x + bW * .32}" y2="${vatY - 36}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .46}" y1="${vatY - 30}" x2="${x + bW * .46}" y2="${vatY - 36}" stroke="${r.col}" stroke-width=".7"/>`;
      // dyed cloth on the rack — a hanging piece
      g += `<path d="M ${x + bW * .34} ${vatY - 34} q 3 -3 6 0 q 3 3 6 0 l 0 12 q -3 3 -6 0 q -3 -3 -6 0 z" fill="${r.err ? "var(--red)" : "#8a5a9a"}" stroke="${r.col}" stroke-width=".6"/>`;
      // dye pots — small bowls of pigment
      for (let p = 0; p < 3; p++) {
        const px = x - bW * .42 + p * 7;
        g += `<rect x="${px}" y="${floorY - 6}" width="6" height="5" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<ellipse cx="${px + 3}" cy="${floorY - 3}" rx="2" ry="1" fill="${p === 0 && r.err ? "var(--red)" : dye}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // dyer stirring for live sessions — figure at the vat
      if (r.live) {
        g += `<g class="dyr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${vatY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scorched cloth — a burnt edge on errors
      if (r.err) g += `<path d="M ${x - bW * .2} ${vatY - 8} l -4 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="dyr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dyr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "染坊", eyebrow: "PROVIDER DYER", render };
})();
