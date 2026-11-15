/* ---------------------------------------------------------------- curriery
 * Curriery view — a row of tanning pits, one per provider. Bark
 * liquor level = remaining quota; a hide hangs on the hook for
 * live sessions; a cracked pit marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "curriery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .8;

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
    if (!top.length) { host.innerHTML = `<div class="cy-empty">暂无鞣坑</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 22) g += `<rect x="${x}" y="${yardY + 6}" width="10" height="3" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const pitW = seg * .68;
      const pitH = 40;
      const pitY = yardY - pitH;
      const liquorH = pitH * .6 * (r.left / 100);
      const liquorY = pitY + pitH - liquorH;
      const tint = r.left > 50 ? "#a07848" : r.left > 20 ? "#885838" : "#683828";
      // pit walls — stone lining
      g += `<rect x="${x - pitW / 2}" y="${pitY}" width="10" height="${pitH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + pitW / 2 - 10}" y="${pitY}" width="10" height="${pitH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - pitW / 2}" y="${yardY - 6}" width="${pitW}" height="6" fill="var(--card-3)"/>`;
      // bark liquor
      g += `<rect x="${x - pitW / 2 + 10}" y="${liquorY.toFixed(0)}" width="${pitW - 20}" height="${liquorH.toFixed(0)}" fill="${tint}" opacity=".5"/>`;
      g += `<path d="M ${x - pitW / 2 + 10} ${liquorY.toFixed(0)} q ${pitW * .2} -3 ${pitW * .4} 0 t ${pitW * .4} 0" stroke="${tint}" stroke-width="1.2" fill="none" opacity=".7"/>`;
      // hide on hook for live sessions
      if (r.live) {
        g += `<g class="cy-hide" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <line x1="${x}" y1="${pitY - 8}" x2="${x}" y2="${pitY + 4}" stroke="${r.col}" stroke-width="1.2"/>
          <path d="M ${x - 6} ${pitY + 4} L ${x + 6} ${pitY + 4} L ${x + 4} ${pitY + 18} L ${x - 4} ${pitY + 18} Z" fill="${tint}" opacity=".7" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // bark pile beside pit
      g += `<ellipse cx="${x + pitW / 2 + 8}" cy="${yardY - 6}" rx="8" ry="4" fill="#7a5a3a" opacity=".6"/>`;
      // cracked pit on errors
      if (r.err) g += `<path d="M ${x - pitW * .15} ${pitY} L ${x + pitW * .1} ${pitY + pitH * .4} L ${x - pitW * .05} ${yardY}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="cy-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞣坑", eyebrow: "QUOTA CURRIERY", render };
})();
