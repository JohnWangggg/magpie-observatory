/* ----------------------------------------------------------------- engraving
 * Engraving view — a row of copper plates, one per provider.
 * Burin lines cut = tokens; an engraver working the
 * plate for live sessions; a slipped cut marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "engraving";
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
    if (!rows.length) { host.innerHTML = `<div class="en-empty">暂无雕版坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ink = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c88840" : "#a06828";
      const plateW = seg * .42;
      const plateY = floorY - 26;
      // the plate — a copper sheet tilted on a sandbag
      g += `<ellipse cx="${x}" cy="${floorY - 8}" rx="${plateW * .42}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<path d="M ${x - plateW * .4} ${plateY + 14} L ${x + plateW * .36} ${plateY} L ${x + plateW * .44} ${plateY + 4} L ${x - plateW * .32} ${plateY + 18} Z" fill="${r.err ? "#b06040" : "#b87840"}" stroke="${r.col}" stroke-width="1.2"/>`;
      // engraved lines — hatching on the plate, count by tokens
      const cuts = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let c = 0; c < cuts; c++) {
        const cx = x - plateW * .3 + c * plateW * .14;
        const cy = plateY + 6 + c * 2;
        g += `<line x1="${cx}" y1="${cy}" x2="${cx + plateW * .1}" y2="${cy - 2}" stroke="${c === 0 && r.err ? "var(--red)" : ink}" stroke-width=".9"/>`;
      }
      // the burin — a graver tool resting on the plate
      g += `<line x1="${x - plateW * .2}" y1="${plateY + 12}" x2="${x + plateW * .18}" y2="${plateY + 4}" stroke="${r.col}" stroke-width="1.5"/>`;
      g += `<circle cx="${x + plateW * .2}" cy="${plateY + 4}" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // a proof — a printed sheet pinned beside
      g += `<rect x="${x + plateW * .5}" y="${plateY - 4}" width="12" height="14" fill="#e8e4d8" stroke="${r.col}" stroke-width=".8"/>`;
      for (let p = 0; p < 2; p++) {
        g += `<line x1="${x + plateW * .52}" y1="${plateY + p * 5}" x2="${x + plateW * .58}" y2="${plateY + p * 5}" stroke="${ink}" stroke-width=".6"/>`;
      }
      // engraver working for live sessions — figure leaning over the plate
      if (r.live) {
        g += `<g class="en-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - plateW * .44} ${plateY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="13" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // slipped cut — a gouged line on errors
      if (r.err) g += `<path d="M ${x - plateW * .1} ${plateY + 6} l ${plateW * .3} 6" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="en-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="en-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雕版坊", eyebrow: "PROVIDER ENGRAVING", render };
})();
