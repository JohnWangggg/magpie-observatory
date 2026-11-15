/* ----------------------------------------------------------------- dewpond
 * Dewpond view — a row of saucer-shaped ponds on the down, one
 * per provider. Water level = quota left; sheep drinking at the
 * edge for live sessions; a cracked clay lining marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dewpond";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const turfY = H * .82;

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
    if (!top.length) { host.innerHTML = `<div class="dp-empty">暂无露池</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // downland turf
    g += `<rect y="${turfY}" width="${W}" height="${H - turfY}" fill="var(--card-2)"/>`;
    for (let x = 8; x < W; x += 20) g += `<path d="M ${x} ${turfY} l 2 -5 l 2 5" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const pondR = seg * .35;
      const pondY = turfY - 4;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // pond saucer — shallow ellipse
      g += `<ellipse cx="${x}" cy="${pondY}" rx="${pondR}" ry="8" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // water level — depth by quota
      const waterH = (r.left / 100) * 6;
      g += `<ellipse cx="${x}" cy="${pondY - 1}" rx="${pondR * .8}" ry="${waterH.toFixed(1)}" fill="#4a90c2" opacity=".5"/>`;
      // sheep at edge for live sessions
      if (r.live) {
        g += `<g class="dp-sheep" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pondR + 10} ${pondY - 4})">
          <ellipse rx="6" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="5" cy="-2" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="4" x2="-4" y2="8" stroke="${r.col}" stroke-width="1"/>
          <line x1="0" y1="4" x2="0" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked lining on errors
      if (r.err) g += `<path d="M ${x - pondR * .3} ${pondY} l 4 3 l -4 3" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${turfY + 18}" text-anchor="middle" class="dp-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "露池", eyebrow: "QUOTA DEWPOND", render };
})();
