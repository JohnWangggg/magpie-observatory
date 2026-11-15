/* ------------------------------------------------------------------ cordwood
 * Cordwood view — a row of woodpiles, one per provider.
 * Faggots stacked for the burn = tokens; a collier cording
 * for live sessions; a tumbled pile marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cordwood";
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
    if (!rows.length) { host.innerHTML = `<div class="cw-empty">暂无柴炭场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // clearing floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a07848" : "#785838";
      const pileW = seg * .42;
      const pileY = floorY - 28;
      const pileH = 24;
      // the cord — a ricked stack with end-on billets
      g += `<rect x="${x - pileW / 2}" y="${pileY}" width="${pileW}" height="${pileH}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // billet ends — rings on the face
      const rows2 = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let rr = 0; rr < rows2; rr++) {
        for (let c = 0; c < 4; c++) {
          const bx = x - pileW * .36 + c * pileW * .24;
          const by = pileY + 6 + rr * 7;
          g += `<circle cx="${bx}" cy="${by}" r="2.2" fill="${rr === 0 && c === 0 && r.err ? "var(--red)" : wood}" stroke="${r.col}" stroke-width=".5"/>`;
        }
      }
      // the ridge — a sloped cap on the cord
      g += `<line x1="${x - pileW / 2}" y1="${pileY}" x2="${x}" y2="${pileY - 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x}" y1="${pileY - 6}" x2="${x + pileW / 2}" y2="${pileY}" stroke="${r.col}" stroke-width="1"/>`;
      // the maul — a splitting maul on a stump beside
      g += `<ellipse cx="${x + pileW * .5 + 8}" cy="${floorY - 10}" rx="5" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + pileW * .5 + 8}" y1="${floorY - 10}" x2="${x + pileW * .5 + 8}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<path d="M ${x + pileW * .5 + 4} ${floorY - 20} l 8 0 l -1 -4 h -6 z" fill="${wood}" stroke="${r.col}" stroke-width=".8"/>`;
      // faggots — bound bundles beside the cord, count by tokens
      const fag = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fag; f++) {
        const fx = x - pileW * .5 - 12 + f * 2;
        g += `<ellipse cx="${fx}" cy="${floorY - 8 - f * 2}" rx="4" ry="6" fill="${f === 0 && r.err ? "var(--red)" : wood}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${fx - 4}" y1="${floorY - 8 - f * 2}" x2="${fx + 4}" y2="${floorY - 8 - f * 2}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // collier cording for live sessions — figure stacking a billet
      if (r.live) {
        g += `<g class="cw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pileW * .12} ${pileY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="10" y2="10" stroke="${r.col}" stroke-width="1.1"/>
          <rect x="10" y="9" width="5" height="3" fill="${wood}" stroke="${r.col}" stroke-width=".6"/>
        </g>`;
      }
      // tumbled pile — a fallen billet on errors
      if (r.err) g += `<rect x="${x - pileW * .2}" y="${floorY - 4}" width="6" height="4" fill="none" stroke="var(--red)" stroke-width="1.4" transform="rotate(18 ${x - pileW * .2} ${floorY - 4})"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "柴炭场", eyebrow: "PROVIDER CORDWOOD", render };
})();
