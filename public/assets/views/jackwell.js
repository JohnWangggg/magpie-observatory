/* ------------------------------------------------------------------ jackwell
 * Jackwell view — a row of river intake wells, one per provider.
 * Water standing in the well = quota left; a pumpman at the
 * rising main for live sessions; a choked screen marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "jackwell";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .84;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="jw-empty">暂无取水井</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // river at the foot + bank
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="#1e3348" opacity=".5"/>`;
    g += `<rect y="${bankY - 4}" width="${W}" height="8" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const shaftW = seg * .5;
      const shaftH = 44;
      const shaftTop = bankY - shaftH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // intake shaft — a masonry tube rooted in the river
      g += `<rect x="${x - shaftW / 2}" y="${shaftTop}" width="${shaftW}" height="${shaftH + 10}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // inner bore
      g += `<rect x="${x - shaftW * .3}" y="${shaftTop + 4}" width="${shaftW * .6}" height="${shaftH}" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // water standing in the bore — level by quota
      const waterH = (r.left / 100) * (shaftH - 8);
      g += `<rect x="${x - shaftW * .3}" y="${(shaftTop + 4 + shaftH - waterH).toFixed(0)}" width="${shaftW * .6}" height="${waterH.toFixed(0)}" fill="${tint}" opacity=".55"/>`;
      // inlet screen at the foot — choked on errors
      g += `<rect x="${x - shaftW * .4}" y="${shaftTop + shaftH - 4}" width="8" height="10" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : "var(--line)"}" stroke-width=".8"/>`;
      for (let s = 0; s < 3; s++) g += `<line x1="${x - shaftW * .4 + 1 + s * 2.4}" y1="${shaftTop + shaftH - 4}" x2="${x - shaftW * .4 + 1 + s * 2.4}" y2="${shaftTop + shaftH + 6}" stroke="${r.err ? "var(--red)" : "var(--line)"}" stroke-width=".6"/>`;
      // rising main off the top — pipe to the pumphouse
      g += `<path d="M ${x + shaftW * .3} ${shaftTop + 8} q 12 -4 18 8" stroke="${r.col}" stroke-width="2" fill="none"/>`;
      // pump house to the right
      g += `<rect x="${x + shaftW * .3 + 12}" y="${shaftTop + 10}" width="16" height="14" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + shaftW * .3 + 12} ${shaftTop + 10} L ${x + shaftW * .3 + 20} ${shaftTop + 4} L ${x + shaftW * .3 + 28} ${shaftTop + 10} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // pumpman at the house for live sessions
      if (r.live) {
        g += `<g class="jw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + shaftW * .3 + 18} ${shaftTop + 6})">
          <circle r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="2" width="6" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      g += `<text x="${x}" y="${bankY + 18}" text-anchor="middle" class="jw-lab">${esc(String(r.prov).split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="jw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "取水井", eyebrow: "QUOTA JACKWELL", render };
})();
