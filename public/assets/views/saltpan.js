/* ------------------------------------------------------------------- saltpan
 * Saltpan view — a row of evaporation pans, one per provider.
 * Salt crystals raked up = tokens; a salter raking the
 * pan for live sessions; a breached levee marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "saltpan";
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
    if (!rows.length) { host.innerHTML = `<div class="sp-empty">暂无晒盐池</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // salt-flat ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const brine = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8d0e0" : "#7898a8";
      const panW = seg * .5;
      const panY = floorY - 18;
      // the pan — a shallow walled pond
      g += `<rect x="${x - panW / 2}" y="${panY}" width="${panW}" height="${floorY - panY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // brine surface
      g += `<rect x="${x - panW * .46}" y="${panY + 3}" width="${panW * .92}" height="${floorY - panY - 6}" fill="${brine}" opacity=".4"/>`;
      // the levee walls
      g += `<line x1="${x - panW / 2}" y1="${panY}" x2="${x + panW / 2}" y2="${panY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // salt crystals — white crust forming on the brine, count by tokens
      const crust = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let c = 0; c < crust; c++) {
        const cx = x - panW * .38 + c * panW * .17;
        g += `<rect x="${cx}" y="${panY + 4 + (c % 2) * 5}" width="${panW * .12}" height="3" fill="${c === 0 && r.err ? "var(--red)" : "#f0f0e8"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // raked salt heap — a conical pile at the pan edge
      g += `<path d="M ${x + panW * .4} ${floorY} l -5 -7 l 10 0 z" fill="${r.err ? "var(--red)" : "#f0f0e8"}" stroke="${r.col}" stroke-width=".7"/>`;
      // the rake — a long-handled tool in the pan
      g += `<line x1="${x - panW * .3}" y1="${panY - 6}" x2="${x - panW * .05}" y2="${panY + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - panW * .05}" y1="${panY + 8}" x2="${x + panW * .05}" y2="${panY + 6}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the windmill pump — a small wind rotor feeding brine
      g += `<line x1="${x + panW * .42}" y1="${panY}" x2="${x + panW * .42}" y2="${panY - 16}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + panW * .42}" y1="${panY - 16}" x2="${x + panW * .34}" y2="${panY - 22}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + panW * .42}" y1="${panY - 16}" x2="${x + panW * .5}" y2="${panY - 22}" stroke="${r.col}" stroke-width=".9"/>`;
      // salter raking for live sessions — figure pushing the rake
      if (r.live) {
        g += `<g class="sp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - panW * .3} ${panY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="12" y2="14" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // breached levee — a gap in the wall on errors
      if (r.err) g += `<path d="M ${x - panW * .1} ${panY} l 6 ${floorY - panY}" stroke="var(--red)" stroke-width="1.5" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "晒盐池", eyebrow: "PROVIDER SALTPAN", render };
})();
