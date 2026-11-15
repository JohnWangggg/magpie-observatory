/* ---------------------------------------------------------------- lockgate
 * Lockgate view — a flight of canal locks, one chamber per provider.
 * Water level in the pound = remaining quota; a narrowboat sits in
 * the chamber for live sessions; a lifted paddle marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lockgate";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
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
    if (!top.length) { host.innerHTML = `<div class="lk-empty">暂无船闸</div>`; return; }

    const pad = 28, chW = (W - pad * (top.length + 1)) / top.length;
    const topY = 32, botY = H * .84;

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;

    top.forEach((r, i) => {
      const px = pad + i * (chW + pad);
      const cx = px + chW / 2;
      const wallW = chW * .18;
      const waterH = (botY - topY) * (r.left / 100);
      const waterY = botY - waterH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // chamber walls
      g += `<rect x="${px}" y="${topY}" width="${wallW}" height="${botY - topY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${px + chW - wallW}" y="${topY}" width="${wallW}" height="${botY - topY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // water fill
      g += `<rect x="${px + wallW}" y="${waterY.toFixed(0)}" width="${chW - wallW * 2}" height="${waterH.toFixed(0)}" fill="${tint}" opacity=".4"/>`;
      g += `<path d="M ${px + wallW} ${waterY.toFixed(0)} q ${chW * .2} -4 ${chW * .4} 0 t ${chW * .4} 0" stroke="${tint}" stroke-width="1.4" fill="none" opacity=".8"/>`;
      // mitre gates at top and bottom — angled
      const gateY1 = topY + 8, gateY2 = botY - 8;
      g += `<line x1="${px + wallW}" y1="${gateY1}" x2="${cx}" y2="${gateY1 + 12}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${px + chW - wallW}" y1="${gateY1}" x2="${cx}" y2="${gateY1 + 12}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${px + wallW}" y1="${gateY2}" x2="${cx}" y2="${gateY2 - 12}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${px + chW - wallW}" y1="${gateY2}" x2="${cx}" y2="${gateY2 - 12}" stroke="${r.col}" stroke-width="2.4"/>`;
      // narrowboat in chamber for live sessions
      if (r.live) {
        const bx = cx, by = waterY + waterH * .4;
        g += `<g class="lk-boat">
          <path d="M ${bx - 14} ${by} L ${bx + 14} ${by} L ${bx + 11} ${by + 7} L ${bx - 11} ${by + 7} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>
          <rect x="${bx - 8}" y="${by - 4}" width="16" height="4" fill="${r.col}" opacity=".6"/>
        </g>`;
      }
      // lifted paddle on errors — sluice open
      if (r.err) {
        g += `<rect x="${px + chW / 2 - 3}" y="${topY - 4}" width="6" height="10" fill="var(--red)" opacity=".8"/>`;
        g += `<line x1="${cx}" y1="${topY - 4}" x2="${cx}" y2="${waterY + 6}" stroke="var(--red)" stroke-width="1" opacity=".6"/>`;
      }
      g += `<text x="${cx}" y="${botY + 18}" text-anchor="middle" class="lk-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "船闸", eyebrow: "QUOTA LOCKGATE", render };
})();
