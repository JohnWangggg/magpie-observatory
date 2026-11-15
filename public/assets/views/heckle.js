/* -------------------------------------------------------------------- heckle
 * Heckle view — a row of hackling benches, one per provider.
 * Combed flax stricks = tokens; a heckler drawing fibre
 * for live sessions; a broken pin marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "heckle";
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
    if (!rows.length) { host.innerHTML = `<div class="hk-empty">暂无梳麻坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const fibre = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c890" : "#a89860";
      const bnW = seg * .4;
      const bnY = floorY - 22;
      const bnH = 10;
      // the hackling bench — a block with a bed of pins
      g += `<rect x="${x - bnW / 2}" y="${bnY}" width="${bnW}" height="${bnH}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - bnW * .4}" y1="${bnY + bnH}" x2="${x - bnW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bnW * .4}" y1="${bnY + bnH}" x2="${x + bnW * .4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the pins — upright spikes on the bench top
      for (let p = 0; p < 6; p++) {
        const px = x - bnW * .4 + p * bnW * .16;
        g += `<line x1="${px}" y1="${bnY}" x2="${px}" y2="${bnY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // the flax strick — fibres being drawn across the pins
      g += `<path d="M ${x - bnW * .5} ${bnY - 4} q ${bnW * .3} -6 ${bnW * .6} 0" fill="none" stroke="${fibre}" stroke-width="2"/>`;
      // tow — short fibre wisps fallen below, count by tokens
      const tow = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < tow; t++) {
        g += `<path d="M ${x - bnW * .3 + t * bnW * .2} ${floorY - 4} q 2 -3 4 0" fill="none" stroke="${t === 0 && r.err ? "var(--red)" : fibre}" stroke-width=".9" opacity=".7"/>`;
      }
      // the strick bundle — finished line flax tied beside
      const stricks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < stricks; s++) {
        g += `<line x1="${x + bnW * .55 + s * 3}" y1="${floorY}" x2="${x + bnW * .53 + s * 3}" y2="${floorY - 14}" stroke="${fibre}" stroke-width="1.4"/>`;
        g += `<line x1="${x + bnW * .53 + s * 3}" y1="${floorY - 9}" x2="${x + bnW * .57 + s * 3}" y2="${floorY - 9}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // heckler drawing for live sessions — figure pulling fibre over the pins
      if (r.live) {
        g += `<g class="hk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bnW * .44} ${bnY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="5" stroke="${r.col}" stroke-width="1.1"/>
          <path d="M 14 5 q 4 0 6 2" fill="none" stroke="${fibre}" stroke-width="1"/>
        </g>`;
      }
      // broken pin — a bent spike on errors
      if (r.err) g += `<path d="M ${x} ${bnY} q 2 -3 4 -5" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "梳麻坊", eyebrow: "PROVIDER HECKLE", render };
})();
