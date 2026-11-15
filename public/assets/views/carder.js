/* ------------------------------------------------------------------- carder
 * Carder view — a row of carding benches, one per provider.
 * Wool tufts on the cards = tokens; a carder combing
 * for live sessions; a snagged tuft marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "carder";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="crd-empty">暂无梳毛</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the bench — a work surface
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wool = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a8" : "#a09070";
      // the bench — a table
      g += `<rect x="${x - bW * .38}" y="${benchY - 4}" width="${bW * .76}" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // the cards — two paddles with teeth
      g += `<rect x="${x - bW * .3}" y="${benchY - 14}" width="${bW * .2}" height="10" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x - bW * .3 + t * bW * .06}" y1="${benchY - 14}" x2="${x - bW * .3 + t * bW * .06}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      g += `<rect x="${x + bW * .1}" y="${benchY - 14}" width="${bW * .2}" height="10" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x + bW * .1 + t * bW * .06}" y1="${benchY - 14}" x2="${x + bW * .1 + t * bW * .06}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // wool tufts — clouds on the cards, count by tokens
      const tufts = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < tufts; t++) {
        const tx = x - bW * .26 + t * bW * .12;
        g += `<ellipse cx="${tx}" cy="${benchY - 16}" rx="5" ry="3.5" fill="${t === 0 && r.err ? "var(--red)" : wool}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${tx - 1}" cy="${benchY - 17}" r=".8" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
        g += `<circle cx="${tx + 1}" cy="${benchY - 15}" r=".8" fill="none" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a rolag — a rolled bundle on the bench
      g += `<ellipse cx="${x + bW * .34}" cy="${benchY - 6}" rx="6" ry="3" fill="${wool}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .34}" cy="${benchY - 6}" rx="2" ry="1.2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      // a wool basket — a container with fibre
      g += `<path d="M ${x - bW * .44} ${benchY - 4} l 4 -10 4 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .4}" cy="${benchY - 8}" rx="3" ry="2" fill="${wool}" stroke="${r.col}" stroke-width=".4"/>`;
      // a comb — a hand card hanging
      g += `<rect x="${x + bW * .38}" y="${benchY - 12}" width="6" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${x + bW * .38 + t * 2}" y1="${benchY - 12}" x2="${x + bW * .38 + t * 2}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // carder combing for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="crd-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .1} ${benchY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snagged tuft — a tangled bit on errors
      if (r.err) g += `<path d="M ${x - bW * .26} ${benchY - 16} q 4 4 8 0 q -4 -4 -8 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="crd-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="crd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "梳毛", eyebrow: "PROVIDER CARDER", render };
})();
