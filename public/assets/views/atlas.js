/* ------------------------------------------------------------------ atlas
 * Atlas view — each quota window is a folded atlas page: a contour
 * island in the middle, remaining quota as a margin ring, and a tiny
 * compass rose in the corner. Sessions pin a flag on the coast.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "atlas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 4);
    if (!top.length) { host.innerHTML = `<div class="at-empty">暂无图页</div>`; return; }

    let g = "";
    const pad = 22, colW = (W - pad * (top.length + 1)) / top.length;
    const pageH = H * 0.68, pageW = Math.min(colW - 12, 168);
    const topY = (H - pageH) / 2 - 14;

    top.forEach((r, i) => {
      const x = pad + i * (colW + pad) + (colW - pageW) / 2;
      const cx = x + pageW / 2, cy = topY + pageH / 2;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // page + torn edges
      g += `<rect x="${x}" y="${topY}" width="${pageW}" height="${pageH}" rx="4" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.4"/>`;
      // margin ring colour
      g += `<rect x="${x + 4}" y="${topY + 4}" width="${pageW - 8}" height="${pageH - 8}" rx="2" fill="none" stroke="${tint}" stroke-width="1" opacity=".5" stroke-dasharray="3 4"/>`;

      // contour island — concentric distorted ellipses
      const islandR = Math.min(pageW, pageH) * 0.34;
      for (let c = 1; c <= 4; c++) {
        const rr = islandR * c / 4;
        const ry = islandR * c / 4 * 0.75;
        const wob = Math.sin(c * 1.7 + i) * 4;
        g += `<ellipse cx="${(cx + wob * .4).toFixed(0)}" cy="${(cy + wob * .2).toFixed(0)}" rx="${rr.toFixed(0)}" ry="${ry.toFixed(0)}" fill="none" stroke="${tint}" stroke-width="${.8 + c * .2}" opacity="${.3 + c * .14}"/>`;
      }
      // peak + flag if live
      if (r.live) {
        g += `<g class="at-flag" transform="translate(${cx},${cy - islandR * .55})">
          <line x1="0" y1="0" x2="0" y2="-12" stroke="${r.col}" stroke-width="1.4"/>
          <path d="M 0 -12 L 8 -9 L 0 -6 Z" fill="${r.col}"/>
        </g>`;
      }
      // compass rose in corner
      g += `<g transform="translate(${x + pageW - 18},${topY + 16})" class="at-rose">
        <circle r="8" fill="none" stroke="var(--faint)" stroke-width=".7"/>
        <path d="M 0 -7 L 1.5 0 L 0 7 L -1.5 0 Z" fill="${tint}"/>
      </g>`;
      g += `<text x="${x + pageW / 2}" y="${topY + pageH + 16}" text-anchor="middle" class="at-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.left}%</text>`;
    });

    host.innerHTML = `<svg class="at-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "图集", eyebrow: "QUOTA ATLAS", render };
})();
