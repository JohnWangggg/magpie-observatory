/* --------------------------------------------------------------- aqueduct
 * Aqueduct view — a row of stone arches carrying a water channel,
 * one arch per provider. Water level in the channel = remaining
 * quota; a bucket on the parapet for live sessions; a cracked
 * pier marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "aqueduct";
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
    if (!top.length) { host.innerHTML = `<div class="aq-empty">暂无渡槽</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    const archH = groundY * .55;
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const pierW = seg * .22;
      const archW = seg * .68;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // piers
      g += `<rect x="${x - archW / 2}" y="${groundY - archH}" width="${pierW}" height="${archH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + archW / 2 - pierW}" y="${groundY - archH}" width="${pierW}" height="${archH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // arch intrados
      g += `<path d="M ${x - archW / 2 + pierW} ${groundY - archH} Q ${x} ${groundY - archH - 20} ${x + archW / 2 - pierW} ${groundY - archH}" fill="none" stroke="${r.col}" stroke-width="1.6"/>`;
      // voussoirs
      for (let v = 0; v < 5; v++) {
        const t = v / 4;
        const vx = x - archW / 2 + pierW + t * (archW - pierW * 2);
        const vy = groundY - archH - Math.sin(t * Math.PI) * 20;
        g += `<rect x="${vx - 2}" y="${vy - 2}" width="4" height="5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      }
      // channel on top — water fill
      const chanY = groundY - archH;
      const chanH = 14;
      const waterH = chanH * (r.left / 100);
      g += `<rect x="${x - archW / 2}" y="${chanY - chanH}" width="${archW}" height="${chanH}" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x - archW / 2}" y="${chanY - waterH}" width="${archW}" height="${waterH}" fill="${tint}" opacity=".5"/>`;
      // parapet
      g += `<rect x="${x - archW / 2}" y="${chanY - chanH - 4}" width="${archW}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // bucket on parapet for live sessions
      if (r.live) {
        g += `<g class="aq-bucket" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${x - 6} ${chanY - chanH - 12} L ${x + 6} ${chanY - chanH - 12} L ${x + 4} ${chanY - chanH - 4} L ${x - 4} ${chanY - chanH - 4} Z" fill="${r.col}" opacity=".8"/>
          <line x1="${x - 6}" y1="${chanY - chanH - 12}" x2="${x}" y2="${chanY - chanH - 18}" stroke="${r.col}" stroke-width="1"/>
          <line x1="${x + 6}" y1="${chanY - chanH - 12}" x2="${x}" y2="${chanY - chanH - 18}" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked pier on errors
      if (r.err) g += `<path d="M ${x - archW / 2 + pierW / 2} ${groundY - archH * .7} L ${x - archW / 2 + pierW / 2 + 4} ${groundY - archH * .4} L ${x - archW / 2 + pierW / 2 - 2} ${groundY - archH * .15}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="aq-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="aq-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "渡槽", eyebrow: "QUOTA AQUEDUCT", render };
})();
