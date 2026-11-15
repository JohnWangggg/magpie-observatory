/* ----------------------------------------------------------------- rigging
 * Rigging view — a row of ship's masts, one per provider. Sail area
 * filled = burn%; a pennant streams for live sessions; a snapped
 * halyard marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rigging";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .82;

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
    if (!top.length) { host.innerHTML = `<div class="rg-empty">暂无桅杆</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)" opacity=".5"/>`;
    for (let x = 0; x < W; x += 24) g += `<path d="M ${x} ${waterY + 8} q 12 -4 24 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const mastH = 60 + (r.used / 100) * 70;
      const mastW = seg * .38;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // hull
      g += `<path d="M ${x - mastW} ${waterY} L ${x + mastW} ${waterY} L ${x + mastW * .7} ${waterY + 14} L ${x - mastW * .7} ${waterY + 14} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // mast
      g += `<line x1="${x}" y1="${waterY + 14}" x2="${x}" y2="${waterY - mastH}" stroke="${r.col}" stroke-width="2"/>`;
      // yard
      g += `<line x1="${x - mastW * .7}" y1="${waterY - mastH * .5}" x2="${x + mastW * .7}" y2="${waterY - mastH * .5}" stroke="${r.col}" stroke-width="1.6"/>`;
      // sail — filled with burn%
      const sailFill = r.used / 100;
      const sailW = mastW * .55;
      const sailY1 = waterY - mastH + 4, sailY2 = waterY - mastH * .5;
      const sailH = sailY2 - sailY1;
      const sailArea = sailH * sailFill;
      g += `<path d="M ${x} ${sailY1} L ${x + sailW} ${sailY2} L ${x} ${sailY2} Z" fill="${tint}" opacity="${(sailFill * .6).toFixed(2)}" stroke="${tint}" stroke-width="1"/>`;
      // pennant for live sessions
      if (r.live) {
        g += `<g class="rg-pennant" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x} ${waterY - mastH} L ${x + 16} ${waterY - mastH - 6} L ${x} ${waterY - mastH - 10} Z" fill="${r.col}" opacity=".8"/>
        </g>`;
      }
      // snapped halyard on errors — line hangs loose
      if (r.err) g += `<path d="M ${x + mastW * .35} ${waterY - mastH * .5} q 4 20 0 34 q -4 6 -8 0" stroke="var(--red)" stroke-width="1.4" fill="none" opacity=".8" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="rg-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "索具", eyebrow: "QUOTA RIGGING", render };
})();
