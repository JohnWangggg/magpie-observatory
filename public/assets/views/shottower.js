/* --------------------------------------------------------------- shottower
 * Shottower view — a row of lead-drop towers, one per quota window.
 * Tower height = burn%; a shot falls for live sessions; a cracked
 * parapet marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shottower";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * 0.86;

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
    if (!top.length) { host.innerHTML = `<div class="st-empty">暂无弹塔</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerH = 50 + (r.used / 100) * 60;
      const baseY = groundY;
      const topY = baseY - towerH;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#c08840" : "#a05830";
      // tower shaft — slight taper
      g += `<path d="M ${x - 14} ${baseY} L ${x - 10} ${topY} L ${x + 10} ${topY} L ${x + 14} ${baseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // parapet
      g += `<rect x="${x - 12}" y="${topY - 8}" width="24" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      for (let p = 0; p < 4; p++) g += `<line x1="${x - 10 + p * 7}" y1="${topY - 8}" x2="${x - 10 + p * 7}" y2="${topY - 12}" stroke="${r.col}" stroke-width="1"/>`;
      // cooling water trough at base
      g += `<rect x="${x - 16}" y="${baseY - 8}" width="32" height="8" fill="var(--card-2)" stroke="${tint}" stroke-width="1" rx="2"/>`;
      g += `<line x1="${x - 14}" y1="${baseY - 6}" x2="${x + 14}" y2="${baseY - 6}" stroke="${tint}" stroke-width="1" opacity=".6"/>`;
      // shot falling for live sessions — drop from top
      for (let s = 0; s < Math.min(2, r.live); s++) {
        const sx = x + (s - .5) * 6;
        g += `<circle cx="${sx.toFixed(0)}" cy="${topY + 8}" r="2.2" fill="${r.col}" opacity=".9">
          <animate attributeName="cy" values="${topY + 8};${(baseY - 4).toFixed(0)}" dur="${.9 + s * .2}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;.3" dur="${.9 + s * .2}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // cracked parapet on errors
      if (r.err) g += `<path d="M ${x - 8} ${topY - 8} l 4 -6 l 3 4" stroke="var(--red)" stroke-width="1.4" fill="none" opacity=".9"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="st-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "弹塔", eyebrow: "QUOTA SHOTTOWER", render };
})();
