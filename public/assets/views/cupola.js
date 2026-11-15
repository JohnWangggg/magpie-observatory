/* -------------------------------------------------------------------- cupola
 * Cupola view — a row of melting stacks, one per provider.
 * Pigs tapped into the sow bed = tokens; a founder charging
 * for live sessions; a frozen tap marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cupola";
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
    if (!rows.length) { host.innerHTML = `<div class="cu-empty">暂无冶炼坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // foundry floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const glow = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e89840" : "#a06030";
      const stackW = seg * .4;
      const stackY = floorY - 44;
      const stackH = 40;
      // the cupola — a tapered stack on legs
      g += `<path d="M ${x - stackW * .22} ${floorY - 8} L ${x - stackW * .16} ${stackY} L ${x + stackW * .16} ${stackY} L ${x + stackW * .22} ${floorY - 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - stackW * .16}" y1="${floorY - 8}" x2="${x - stackW * .16}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + stackW * .16}" y1="${floorY - 8}" x2="${x + stackW * .16}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the charging door near the top
      g += `<rect x="${x - 4}" y="${stackY + 6}" width="8" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      // melt glow — a bright window near the bosh
      g += `<rect x="${x - 3}" y="${stackY + stackH - 14}" width="6" height="5" fill="${glow}" stroke="${r.col}" stroke-width=".7"/>`;
      // the tuyere — a blast pipe into the stack
      g += `<line x1="${x - stackW * .3}" y1="${floorY - 14}" x2="${x - stackW * .16}" y2="${floorY - 16}" stroke="${r.col}" stroke-width="1.4"/>`;
      // the tap hole at the base — a spout to the sow bed
      g += `<line x1="${x + stackW * .18}" y1="${floorY - 10}" x2="${x + stackW * .3}" y2="${floorY - 6}" stroke="${r.err ? "var(--red)" : glow}" stroke-width="2"/>`;
      // the sow bed — a sand trough with pigs, count by tokens
      g += `<rect x="${x + stackW * .3}" y="${floorY - 8}" width="${stackW * .22}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      const pigs = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pigs; p++) {
        g += `<line x1="${x + stackW * .32 + p * 6}" y1="${floorY - 8}" x2="${x + stackW * .32 + p * 6}" y2="${floorY - 4}" stroke="${p === 0 && r.err ? "var(--red)" : glow}" stroke-width="2.2"/>`;
      }
      // founder charging for live sessions — figure at the door with a barrow
      if (r.live) {
        g += `<g class="cu-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - stackW * .42} ${stackY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // frozen tap — a dashed plug on errors
      if (r.err) g += `<ellipse cx="${x + stackW * .24}" cy="${floorY - 8}" rx="3" ry="2" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cu-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冶炼坊", eyebrow: "PROVIDER CUPOLA", render };
})();
