/* ------------------------------------------------------------- watertower
 * Watertower view — a row of elevated tanks, one per provider.
 * Water level in the tank = quota left; a hydrant running at the
 * base for live sessions; a burst seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "watertower";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .86;

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
    if (!top.length) { host.innerHTML = `<div class="wt-empty">暂无水塔</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const tankW = seg * .55;
      const tankH = 34;
      const tankTop = H * .18;
      const tankBot = tankTop + tankH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // trestle legs
      g += `<path d="M ${x - tankW * .35} ${tankBot} L ${x - tankW * .45} ${groundY} M ${x + tankW * .35} ${tankBot} L ${x + tankW * .45} ${groundY} M ${x} ${tankBot} L ${x} ${groundY}" stroke="${r.col}" stroke-width="1.6" fill="none"/>`;
      g += `<line x1="${x - tankW * .4}" y1="${(tankBot + groundY) / 2}" x2="${x + tankW * .4}" y2="${(tankBot + groundY) / 2}" stroke="${r.col}" stroke-width="1" opacity=".5"/>`;
      // tank body
      g += `<rect x="${x - tankW / 2}" y="${tankTop}" width="${tankW}" height="${tankH}" rx="4" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // water inside — level by quota
      const waterH = (r.left / 100) * (tankH - 8);
      g += `<rect x="${x - tankW / 2 + 2}" y="${(tankBot - 4 - waterH).toFixed(1)}" width="${tankW - 4}" height="${waterH.toFixed(1)}" fill="${tint}" opacity=".5"/>`;
      // roof cone
      g += `<path d="M ${x - tankW / 2 - 2} ${tankTop} L ${x} ${tankTop - 10} L ${x + tankW / 2 + 2} ${tankTop} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // riser pipe down the middle leg
      g += `<line x1="${x}" y1="${tankBot}" x2="${x}" y2="${groundY}" stroke="${r.col}" stroke-width="1.2" opacity=".6"/>`;
      // hydrant running for live sessions
      if (r.live) {
        g += `<g class="wt-hydrant" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + tankW / 2 + 10} ${groundY - 6})">
          <rect x="-3" y="0" width="6" height="8" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="0" cy="-1" r="2" fill="${r.col}"/>
          <path d="M 3 2 q 6 2 8 6" stroke="${tint}" stroke-width="1.6" fill="none" opacity=".8"/>
        </g>`;
      }
      // burst seam on errors
      if (r.err) g += `<path d="M ${x + tankW / 4} ${tankTop + 8} l 4 8 l -4 8" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="wt-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水塔", eyebrow: "QUOTA WATERTOWER", render };
})();
