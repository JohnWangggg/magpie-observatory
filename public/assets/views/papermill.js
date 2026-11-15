/* --------------------------------------------------------------- papermill
 * Papermill view — a row of dipping vats, one per provider. Pulp
 * level = remaining quota; a couch sheet lifts out for live
 * sessions; a torn mould marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "papermill";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .8;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 4);
    if (!top.length) { host.innerHTML = `<div class="pm-empty">暂无纸槽</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // work bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<line x1="${x}" y1="${benchY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const vatW = seg * .7;
      const vatH = 56;
      const vatY = benchY - vatH;
      const pulpH = vatH * .7 * (r.left / 100);
      const pulpY = benchY - pulpH;
      const tint = r.left > 50 ? "#a08858" : r.left > 20 ? "#b07848" : "#a04838";
      // vat walls
      g += `<rect x="${x - vatW / 2}" y="${vatY}" width="8" height="${vatH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + vatW / 2 - 8}" y="${vatY}" width="8" height="${vatH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - vatW / 2}" y="${benchY - 6}" width="${vatW}" height="6" fill="var(--card-3)"/>`;
      // pulp
      g += `<rect x="${x - vatW / 2 + 8}" y="${pulpY.toFixed(0)}" width="${vatW - 16}" height="${pulpH.toFixed(0)}" fill="${tint}" opacity=".5"/>`;
      g += `<path d="M ${x - vatW / 2 + 8} ${pulpY.toFixed(0)} q ${vatW * .2} -4 ${vatW * .4} 0 t ${vatW * .4} 0" stroke="${tint}" stroke-width="1.4" fill="none" opacity=".7"/>`;
      // mould frame at vat rim
      g += `<rect x="${x - vatW / 2 + 10}" y="${vatY - 4}" width="${vatW - 20}" height="6" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 2"' : ""}/>`;
      // sheet lifting out for live sessions
      if (r.live) {
        g += `<g class="pm-sheet" style="animation-delay: ${(i * .4).toFixed(1)}s">
          <rect x="${x - vatW * .3}" y="${vatY - 20}" width="${vatW * .6}" height="${vatH * .5}" rx="1" fill="var(--card)" stroke="${r.col}" stroke-width="1" opacity=".92"/>
          <line x1="${x - vatW * .3 + 6}" y1="${vatY - 14}" x2="${x + vatW * .3 - 6}" y2="${vatY - 14}" stroke="${r.col}" stroke-width=".8" opacity=".5"/>
          <line x1="${x - vatW * .3 + 6}" y1="${vatY - 6}" x2="${x + vatW * .3 - 6}" y2="${vatY - 6}" stroke="${r.col}" stroke-width=".8" opacity=".5"/>
        </g>`;
      }
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="pm-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "抄纸坊", eyebrow: "QUOTA PAPERMILL", render };
})();
