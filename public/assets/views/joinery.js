/* ------------------------------------------------------------------- joinery
 * Joinery view — a row of workbenches, one per provider.
 * Dovetail joints cut and framed panels = tokens; a joiner at
 * the plane for live sessions; a blown mortise marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "joinery";
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
    if (!rows.length) { host.innerHTML = `<div class="jy-empty">暂无细木坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // workshop floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0a868" : "#a88248";
      const benchY = floorY - 22;
      const benchW = seg * .55;
      // the bench — a plank top with a face-vise jaw at the end
      g += `<line x1="${x - benchW / 2}" y1="${benchY}" x2="${x + benchW / 2}" y2="${benchY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - benchW * .32}" y1="${benchY}" x2="${x - benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + benchW * .32}" y1="${benchY}" x2="${x + benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<rect x="${x + benchW * .3}" y="${benchY - 5}" width="5" height="10" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // workpiece on the bench — a panel with a dovetail fan, count by tokens
      const tails = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let t = 0; t < tails; t++) {
        g += `<path d="M ${x - benchW * .18 + t * 7} ${benchY - 1} l 2 -4 l 4 4" fill="${wood}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // framed panels leaning against the bench — stiles by tokens
      const panels = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < panels; p++) {
        g += `<rect x="${x + benchW / 2 - 4 - p * 6}" y="${floorY - 4 - p * 5}" width="5" height="12" fill="none" stroke="${wood}" stroke-width="1.2" transform="rotate(6 ${x + benchW / 2} ${floorY})"/>`;
      }
      // wood curls — a shaving on the bench top
      g += `<path d="M ${x - benchW * .1} ${benchY - 4} q 3 -3 6 0" stroke="${wood}" stroke-width="1" fill="none" opacity=".8"/>`;
      // joiner at the plane for live sessions — pushing a block plane
      if (r.live) {
        g += `<g class="jy-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - benchW * .3} ${benchY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="3" y="7" width="10" height="3" rx="1" fill="${wood}" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // blown mortise — a split in the workpiece on errors
      if (r.err) g += `<line x1="${x - benchW * .1}" y1="${benchY - 5}" x2="${x - benchW * .06}" y2="${benchY - 1}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="jy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="jy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "细木坊", eyebrow: "PROVIDER JOINERY", render };
})();
