/* ----------------------------------------------------------------- saltern
 * Saltern view — a row of evaporating ponds, one per provider.
 * Salt crust on the pan = quota left; a raker gathering for live
 * sessions; a burst bank marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "saltern";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .82;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="st-empty">暂无盐田</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // flat marsh
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="var(--card-2)"/>`;
    for (let x = 10; x < W; x += 24) g += `<path d="M ${x} ${bankY} l 2 -4 l 2 4" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const panW = seg * .7;
      const panH = 22;
      const panY = bankY - panH;
      const tint = r.left > 50 ? "#e8e0d0" : r.left > 20 ? "#d0c8b0" : "#a09078";
      // pan — shallow rectangle with banks
      g += `<rect x="${x - panW / 2}" y="${panY}" width="${panW}" height="${panH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // brine surface
      g += `<rect x="${x - panW / 2 + 2}" y="${panY + 4}" width="${panW - 4}" height="${panH - 8}" fill="#4a90c2" opacity=".2"/>`;
      // salt crust — thickness by remaining quota
      const crustH = (r.left / 100) * (panH - 8);
      g += `<rect x="${x - panW / 2 + 2}" y="${(panY + panH - 4 - crustH).toFixed(0)}" width="${panW - 4}" height="${crustH.toFixed(0)}" fill="${tint}" opacity=".7"/>`;
      // crystal sparkles on crust
      const sparkles = Math.min(4, Math.ceil(r.left / 25));
      for (let s = 0; s < sparkles; s++) {
        const sx = x - panW * .3 + s * (panW * .6 / (sparkles - 1 || 1));
        const sy = panY + panH - 6 - crustH * .3;
        g += `<path d="M ${sx.toFixed(0)} ${sy.toFixed(0)} l 2 -4 l 2 4 l -2 4 Z" fill="#fff" opacity=".6"/>`;
      }
      // raker with rake for live sessions
      if (r.live) {
        g += `<g class="st-raker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + panW / 2 + 12} ${panY + 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="0" x2="10" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // burst bank on errors
      if (r.err) g += `<path d="M ${x + panW * .3} ${panY} l 4 -4 l -4 -4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${bankY + 18}" text-anchor="middle" class="st-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "盐田", eyebrow: "QUOTA SALTERN", render };
})();
