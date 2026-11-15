/* ----------------------------------------------------------------- wirebench
 * Wirebench view — a row of drawbenches, one per provider.
 * Wire drawn through the plate = tokens; a wireman hauling
 * the swing lever for live sessions; a broken wire marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wirebench";
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
    if (!rows.length) { host.innerHTML = `<div class="wb-empty">暂无拉丝台</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wire = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0c8b8" : "#a89880";
      const benchY = floorY - 20;
      // drawbench — a long bed on legs
      g += `<rect x="${x - seg * .32}" y="${benchY}" width="${seg * .64}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - seg * .26}" y1="${benchY + 5}" x2="${x - seg * .26}" y2="${floorY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + seg * .26}" y1="${benchY + 5}" x2="${x + seg * .26}" y2="${floorY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // drawplate standing on the bed — a plate with holes
      g += `<rect x="${x - 4}" y="${benchY - 14}" width="8" height="14" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let h = 0; h < 3; h++) g += `<circle cx="${x}" cy="${benchY - 11 + h * 4}" r="1" fill="var(--card-2)"/>`;
      // wire coming out — a thin line with a coil, length by tokens
      const wireLen = seg * .2 + (r.tok / maxTok) * seg * .15;
      g += `<path d="M ${x + 4} ${benchY - 8} l ${wireLen} 0 q 6 2 4 6" stroke="${wire}" stroke-width="1.2" fill="none"/>`;
      // tongs gripping the wire
      g += `<path d="M ${x - 10} ${benchY - 10} l 6 2 M ${x - 10} ${benchY - 6} l 6 -2" stroke="${r.col}" stroke-width="1.2"/>`;
      // coiled wire beside — coils by tokens
      const coils = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let c = 0; c < coils; c++) {
        g += `<circle cx="${x + seg * .34 + c * 8}" cy="${floorY - 5}" r="3.5" fill="none" stroke="${wire}" stroke-width="1" opacity=".9"/>`;
      }
      // wireman hauling the lever for live sessions
      if (r.live) {
        g += `<g class="wb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .32 - 8} ${floorY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="-2" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // broken wire — a kinked end on errors
      if (r.err) g += `<path d="M ${x + 4 + wireLen} ${benchY - 8} l 4 -3 l 2 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拉丝台", eyebrow: "PROVIDER WIREBENCH", render };
})();
