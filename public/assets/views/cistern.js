/* ----------------------------------------------------------------- cistern
 * Cistern view — vaulted water tanks under a basilica, one per quota
 * window. Water level = remaining quota; drips fall for live sessions;
 * a red streak on the arch marks a window with errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cistern";
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
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="cs-empty">暂无水池</div>`; return; }

    const pad = 26, cw = (W - pad * (top.length + 1)) / top.length;
    const archY = 26, archH = H * .68;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ceiling line
    g += `<line y="${archY - 8}" x2="${W}" y2="${archY - 8}" stroke="var(--line)" stroke-width="1.4"/>`;

    top.forEach((r, i) => {
      const px = pad + i * (cw + pad);
      const wallW = cw, wallH = archH;
      const waterH = wallH * (r.left / 100);
      const waterY = archY + wallH - waterH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // arch outline — pointed arch
      const midX = px + wallW / 2;
      g += `<path d="M ${px} ${archY + wallH} L ${px} ${archY + 14} Q ${px + wallW / 2} ${archY - 14} ${px + wallW} ${archY + 14} L ${px + wallW} ${archY + wallH} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // water fill
      g += `<rect x="${px + 2}" y="${waterY.toFixed(0)}" width="${wallW - 4}" height="${waterH.toFixed(0)}" fill="${tint}" opacity=".4"/>`;
      // water surface ripple
      g += `<path d="M ${px + 2} ${waterY.toFixed(0)} q ${wallW / 4} -4 ${wallW / 2} 0 t ${wallW / 2} 0" stroke="${tint}" stroke-width="1.6" fill="none" opacity=".8"/>`;
      // drips for live sessions — small falling dots
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const dx = px + wallW / 2 + (s - 1) * 10;
        g += `<circle cx="${dx.toFixed(0)}" cy="${(waterY - 18 - s * 6).toFixed(0)}" r="2.2" fill="${r.col}" opacity=".85">
          <animate attributeName="cy" values="${(waterY - 26).toFixed(0)};${waterY.toFixed(0)}" dur="${1 + s * .25}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;.2" dur="${1 + s * .25}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // error streak on arch face
      if (r.err) g += `<line x1="${(px + 3).toFixed(0)}" y1="${archY + 6}" x2="${(px + 3).toFixed(0)}" y2="${archY + wallH * .5}" stroke="var(--red)" stroke-width="2" opacity=".7"/>`;
      g += `<text x="${midX.toFixed(0)}" y="${archY + wallH + 20}" text-anchor="middle" class="cs-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cs-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蓄水池", eyebrow: "QUOTA CISTERN", render };
})();
