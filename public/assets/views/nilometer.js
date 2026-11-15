/* --------------------------------------------------------------- nilometer
 * Nilometer view — a row of stone well-shafts with cubit scales,
 * one per provider. Water standing in the shaft = quota left;
 * a reader leaning over the coping for live sessions; a silted
 * bottom marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nilometer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const stairY = H * .84;

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
    if (!top.length) { host.innerHTML = `<div class="nm-empty">暂无水位计</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // river bank
    g += `<rect y="${stairY}" width="${W}" height="${H - stairY}" fill="var(--card-2)"/>`;
    g += `<rect y="${stairY}" width="${W}" height="${H - stairY}" fill="#1e3348" opacity=".25"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const shaftW = seg * .55;
      const shaftH = 46;
      const shaftTop = stairY - shaftH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // shaft wall — a stone well tube
      g += `<rect x="${x - shaftW / 2}" y="${shaftTop}" width="${shaftW}" height="${shaftH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // inner bore
      g += `<rect x="${x - shaftW * .32}" y="${shaftTop + 3}" width="${shaftW * .64}" height="${shaftH - 6}" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;
      // water standing in the bore — level by quota
      const waterH = (r.left / 100) * (shaftH - 10);
      g += `<rect x="${x - shaftW * .32}" y="${(shaftTop + shaftH - 3 - waterH).toFixed(0)}" width="${shaftW * .64}" height="${waterH.toFixed(0)}" fill="${tint}" opacity=".55"/>`;
      // cubit marks carved in the wall — 6 divisions
      for (let c = 1; c <= 6; c++) {
        const cy = shaftTop + shaftH - 3 - c * (shaftH - 6) / 6.5;
        g += `<line x1="${x + shaftW * .28}" y1="${cy.toFixed(0)}" x2="${x + shaftW * .38}" y2="${cy.toFixed(0)}" stroke="var(--line)" stroke-width=".8" opacity=".8"/>`;
      }
      // silted bottom — a mud layer on errors
      if (r.err) g += `<rect x="${x - shaftW * .32}" y="${shaftTop + shaftH - 8}" width="${shaftW * .64}" height="5" fill="var(--red)" opacity=".4"/>`;
      // coping ring at the mouth
      g += `<rect x="${x - shaftW / 2 - 2}" y="${shaftTop - 3}" width="${shaftW + 4}" height="4" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // reader leaning over for live sessions
      if (r.live) {
        g += `<g class="nm-reader" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + shaftW / 2 + 8} ${shaftTop - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      g += `<text x="${x}" y="${stairY + 18}" text-anchor="middle" class="nm-lab">${esc(String(r.prov).split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="nm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "尼罗水位计", eyebrow: "QUOTA NILOMETER", render };
})();
