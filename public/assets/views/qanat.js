/* ------------------------------------------------------------------ qanat
 * Qanat view — a row of underground water galleries in cross-
 * section, one per provider. Water in the channel = quota left;
 * a muqanni at the shaft for live sessions; a collapsed bore
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "qanat";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const surfaceY = H * .36;

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
    if (!top.length) { host.innerHTML = `<div class="qn-empty">暂无坎儿井</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // surface line
    g += `<line x1="0" y1="${surfaceY}" x2="${W}" y2="${surfaceY}" stroke="var(--line)" stroke-width="1.4"/>`;
    // strata
    for (let x = 0; x < W; x += 40) g += `<path d="M ${x} ${surfaceY + 30} q 20 4 40 0" stroke="var(--line)" stroke-width=".7" fill="none" opacity=".3"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const shaftW = 14;
      const channelY = H * .78;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // vertical shaft from surface to gallery
      g += `<rect x="${x - shaftW / 2}" y="${surfaceY}" width="${shaftW}" height="${channelY - surfaceY}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // spoil ring around the shaft mouth
      g += `<ellipse cx="${x}" cy="${surfaceY}" rx="${shaftW * 1.4}" ry="4" fill="none" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // gallery — horizontal channel with water by quota
      const galW = seg * .6;
      const waterH = 2 + (r.left / 100) * 8;
      g += `<rect x="${x - galW / 2}" y="${channelY}" width="${galW}" height="14" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<rect x="${x - galW / 2 + 1}" y="${(channelY + 13 - waterH).toFixed(1)}" width="${galW - 2}" height="${waterH.toFixed(1)}" fill="${tint}" opacity=".6"/>`;
      // flow arrows
      g += `<path d="M ${x - 8} ${channelY + 7} l 6 0 m -2 -2 l 2 2 l -2 2" stroke="${r.col}" stroke-width="1" fill="none" opacity=".6"/>`;
      // muqanni on the shaft lip for live sessions
      if (r.live) {
        g += `<g class="qn-worker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + shaftW + 10} ${surfaceY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="0" x2="-12" y2="4" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="-13" cy="5" r="2.5" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // collapsed bore on errors — debris in shaft
      if (r.err) g += `<path d="M ${x - 5} ${surfaceY + 30} l 5 8 l -5 8 l 5 6" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${channelY + 30}" text-anchor="middle" class="qn-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="qn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "坎儿井", eyebrow: "QUOTA QANAT", render };
})();
