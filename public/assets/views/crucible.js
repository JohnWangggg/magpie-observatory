/* ---------------------------------------------------------------- crucible
 * Crucible view — a row of refractory pots on a casting floor, one
 * per provider. Melt level = remaining quota; a pouring ladle tips
 * for live sessions; a cracked rim marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crucible";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * 0.84;

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
    if (!top.length) { host.innerHTML = `<div class="cu-empty">暂无熔杯</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // casting floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 18) g += `<line x1="${x}" y1="${floorY + 4}" x2="${x + 8}" y2="${floorY + 4}" stroke="var(--faint)" stroke-width=".8" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const potH = 44 + (r.used / 100) * 40;
      const potW = 22 + (r.used / 100) * 14;
      const rimY = floorY - potH;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#e06048" : "#a03028";
      // pot body — tapered
      g += `<path d="M ${x - potW * .5} ${rimY} L ${x - potW * .65} ${floorY} L ${x + potW * .65} ${floorY} L ${x + potW * .5} ${rimY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // rim
      g += `<ellipse cx="${x}" cy="${rimY}" rx="${potW * .55}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // melt surface inside
      const meltY = rimY + potH * (1 - r.left / 100);
      g += `<ellipse cx="${x}" cy="${meltY.toFixed(0)}" rx="${potW * .4}" ry="3" fill="${tint}" opacity=".7"/>`;
      g += `<rect x="${x - potW * .4}" y="${meltY.toFixed(0)}" width="${potW * .8}" height="${(floorY - meltY).toFixed(0)}" fill="${tint}" opacity=".3"/>`;
      // pouring ladle — tips when live
      if (r.live) {
        const lx = x + potW + 14, ly = rimY + 6;
        g += `<g class="cu-ladle" style="transform-origin: ${lx}px ${ly}px; animation-duration: ${Math.max(1.4, 3 - r.used * .02).toFixed(1)}s">
          <line x1="${lx}" y1="${ly}" x2="${lx - 10}" y2="${ly - 12}" stroke="${r.col}" stroke-width="2"/>
          <path d="M ${lx - 12} ${ly - 12} L ${lx - 4} ${ly - 16} L ${lx - 2} ${ly - 8} Z" fill="${r.col}" opacity=".8"/>
          <path d="M ${lx - 8} ${ly - 10} L ${lx - 14} ${ly - 16}" stroke="${tint}" stroke-width="1.4" opacity=".8"/>
        </g>`;
      }
      // crack on rim for errors
      if (r.err) g += `<path d="M ${x - potW * .5} ${rimY} l 4 -6 l 3 4" stroke="var(--red)" stroke-width="1.4" fill="none" opacity=".9"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cu-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cu-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "熔杯", eyebrow: "QUOTA CRUCIBLE", render };
})();
