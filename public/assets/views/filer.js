/* -------------------------------------------------------------------- filer
 * Filer view — a row of filing benches, one per provider.
 * Bright filings off the work = tokens; a filer draw-filing
 * for live sessions; a blunt edge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "filer";
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
    if (!rows.length) { host.innerHTML = `<div class="fl-empty">暂无锉匠坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench-floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const steel = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8b8d0" : "#808090";
      const benchY = floorY - 20;
      const benchW = seg * .5;
      // the bench — a heavy plank with a leg vice at the end
      g += `<line x1="${x - benchW / 2}" y1="${benchY}" x2="${x + benchW / 2}" y2="${benchY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - benchW * .32}" y1="${benchY}" x2="${x - benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + benchW * .32}" y1="${benchY}" x2="${x + benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // leg vice — a jaw at the end with a screw
      g += `<rect x="${x + benchW * .28}" y="${benchY - 6}" width="7" height="12" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<circle cx="${x + benchW * .31}" cy="${benchY - 2}" r="1.5" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      // workpiece — a bar clamped in the vice
      g += `<line x1="${x + benchW * .2}" y1="${benchY - 4}" x2="${x + benchW * .32}" y2="${benchY - 4}" stroke="${steel}" stroke-width="3" stroke-linecap="round"/>`;
      // bright filings — a scatter of strokes on the bench
      const fil = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fil; f++) {
        g += `<line x1="${x - benchW * .15 + f * 8}" y1="${benchY - 2}" x2="${x - benchW * .13 + f * 8}" y2="${benchY}" stroke="${steel}" stroke-width=".8" opacity=".8"/>`;
      }
      // finished pieces stacked beside — rings by tokens
      const pieces = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pieces; p++) {
        g += `<ellipse cx="${x - benchW * .34}" cy="${floorY - 5 - p * 4}" rx="4" ry="2" fill="none" stroke="${steel}" stroke-width="1"/>`;
      }
      // filer draw-filing for live sessions — figure with a long stroke
      if (r.live) {
        g += `<g class="fl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - benchW * .42} ${benchY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="16" y2="4" stroke="${r.col}" stroke-width="1.3"/>
        </g>`;
      }
      // blunt edge — a rolled burr on the workpiece on errors
      if (r.err) g += `<path d="M ${x + benchW * .24} ${benchY - 4} q 4 -3 8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="fl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锉匠坊", eyebrow: "PROVIDER FILER", render };
})();
