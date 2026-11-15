/* --------------------------------------------------------------- illuminator
 * Illuminator view — a row of illuminator's desks, one per provider.
 * Gilded initials finished on the shelf = tokens; a limner
 * laying gold leaf for live sessions; a smudged initial marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "illuminator";
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
    if (!rows.length) { host.innerHTML = `<div class="ilm-empty">暂无缮写坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const gold = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c048" : "#987830";
      const dW = seg * .4;
      const dTop = floorY - 30;
      // the sloped desk — a lectern-like writing slope
      g += `<path d="M ${x - dW / 2} ${dTop + 6} L ${x + dW / 2} ${dTop - 2} L ${x + dW / 2} ${dTop + 2} L ${x - dW / 2} ${dTop + 10} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - dW * .4}" y1="${dTop + 8}" x2="${x - dW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + dW * .4}" y1="${dTop + 4}" x2="${x + dW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the manuscript page on the slope — with text lines
      g += `<rect x="${x - dW * .28}" y="${dTop - 4}" width="${dW * .5}" height="16" rx="1" fill="#e8e0d0" stroke="${r.col}" stroke-width=".8" transform="rotate(-4 ${x} ${dTop + 4})"/>`;
      for (let tl = 0; tl < 3; tl++) {
        g += `<line x1="${x - dW * .24}" y1="${dTop - 1 + tl * 4}" x2="${x - dW * .02}" y2="${dTop - 2 + tl * 4}" stroke="#a09880" stroke-width=".7" transform="rotate(-4 ${x} ${dTop + 4})"/>`;
      }
      // the illuminated initial — a gilded letter box on the page
      g += `<rect x="${x + dW * .02}" y="${dTop - 2}" width="8" height="8" rx="1" fill="${r.err ? "var(--red)" : gold}" stroke="${r.col}" stroke-width=".6" transform="rotate(-4 ${x} ${dTop + 4})"/>`;
      // pigment shells — small cups of colour beside the desk
      for (let pg = 0; pg < 3; pg++) {
        g += `<path d="M ${x - dW * .58 + pg * 5} ${floorY - 4} a 2.4 2.4 0 0 1 4.4 0 z" fill="${["#c04038", "#3868b0", "#c0a030"][pg]}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // finished initials on a rack, count by tokens
      const leaves = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      g += `<line x1="${x + dW * .52}" y1="${dTop - 10}" x2="${x + dW * .52}" y2="${floorY}" stroke="${r.col}" stroke-width="1"/>`;
      for (let f = 0; f < leaves; f++) {
        g += `<rect x="${x + dW * .54 + f * 5}" y="${dTop - 8 + f * 4}" width="5" height="7" rx="1" fill="${f === 0 && r.err ? "var(--red)" : "#e8e0d0"}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<rect x="${x + dW * .55 + f * 5}" y="${dTop - 6 + f * 4}" width="3" height="3" fill="${gold}" opacity=".9"/>`;
      }
      // limner painting for live sessions — figure with a fine brush
      if (r.live) {
        g += `<g class="ilm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - dW * .6} ${dTop - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="14" y2="8" stroke="${r.col}" stroke-width=".9"/>
          <circle cx="15" cy="8" r=".8" fill="${gold}"/>
        </g>`;
      }
      // smudged initial — a blot on errors
      if (r.err) g += `<ellipse cx="${x + dW * .06}" cy="${dTop + 3}" rx="3" ry="2" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ilm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ilm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缮写坊", eyebrow: "PROVIDER ILLUMINATOR", render };
})();
