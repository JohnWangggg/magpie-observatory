/* ------------------------------------------------------------------ polelathe
 * Polelathe view — a row of pole lathes, one per provider.
 * Turned billets on the bench = tokens; a turner treadling
 * for live sessions; a thrown billet marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "polelathe";
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
    if (!rows.length) { host.innerHTML = `<div class="pll-empty">暂无杆车床</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c09858" : "#987040";
      const latW = seg * .46;
      const bedY = floorY - 16;
      // the lathe bed — two rails on legs
      g += `<line x1="${x - latW / 2}" y1="${bedY}" x2="${x + latW / 2}" y2="${bedY}" stroke="${r.col}" stroke-width="1.5"/>`;
      g += `<line x1="${x - latW / 2}" y1="${bedY + 4}" x2="${x + latW / 2}" y2="${bedY + 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - latW * .42}" y1="${bedY + 4}" x2="${x - latW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + latW * .42}" y1="${bedY + 4}" x2="${x + latW * .42}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // headstock and tailstock — the two centers
      g += `<rect x="${x - latW * .34}" y="${bedY - 8}" width="5" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<rect x="${x + latW * .3}" y="${bedY - 8}" width="5" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the workpiece — a billet spinning between centers
      g += `<line x1="${x - latW * .28}" y1="${bedY - 5}" x2="${x + latW * .28}" y2="${bedY - 5}" stroke="${wood}" stroke-width="3"/>`;
      // the pole — a springy sapling arm overhead driving the cord
      g += `<path d="M ${x - latW * .4} ${bedY - 26} q ${latW * .4} -8 ${latW * .5} 0" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - latW * .4}" y1="${bedY - 26}" x2="${x - latW * .4}" y2="${bedY - 5}" stroke="${r.col}" stroke-width=".9"/>`;
      // the treadle — a foot bar linked to the cord
      g += `<line x1="${x - latW * .4}" y1="${bedY - 5}" x2="${x - latW * .3}" y2="${floorY - 4}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - latW * .36}" y1="${floorY - 4}" x2="${x - latW * .24}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.3"/>`;
      // turned billets — finished pieces on the bench, count by tokens
      const bits = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < bits; b++) {
        g += `<line x1="${x + latW * .5 + b * 4}" y1="${floorY - 4 - b * 2}" x2="${x + latW * .5 + b * 4 + 8}" y2="${floorY - 4 - b * 2}" stroke="${b === 0 && r.err ? "var(--red)" : wood}" stroke-width="2.5"/>`;
      }
      // shavings — curls under the workpiece
      g += `<path d="M ${x - 6} ${bedY} q 3 3 0 5 M ${x} ${bedY} q 3 3 0 5" fill="none" stroke="${wood}" stroke-width=".6" opacity=".6"/>`;
      // turner treadling for live sessions — figure with a gouge
      if (r.live) {
        g += `<g class="pll-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + latW * .44} ${bedY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="8" x2="-13" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // thrown billet — the workpiece off its centers on errors
      if (r.err) g += `<line x1="${x - latW * .28}" y1="${bedY - 5}" x2="${x + latW * .28}" y2="${bedY - 2}" stroke="var(--red)" stroke-width="3"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pll-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pll-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "杆车床", eyebrow: "PROVIDER POLELATHE", render };
})();
