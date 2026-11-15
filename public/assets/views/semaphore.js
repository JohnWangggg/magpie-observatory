/* --------------------------------------------------------------- semaphore
 * Semaphore view — a line of shuttered signal towers, one per quota
 * window. The two-arm position maps burn%; the lamp on top glows for
 * live sessions and blinks red on errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "semaphore";
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
    if (!top.length) { host.innerHTML = `<div class="sm-empty">暂无信号塔</div>`; return; }

    const groundY = H * 0.86;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerH = 60 + (r.used / 100) * (groundY - 100);
      const baseY = groundY;
      const topY = baseY - towerH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // tower
      g += `<rect x="${x - 6}" y="${topY}" width="12" height="${towerH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // pivot housing
      g += `<circle cx="${x}" cy="${topY}" r="9" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // semaphore arms — two arms map usage in opposite directions
      const armL = 26;
      const a1 = -Math.PI / 4 - (r.used / 100) * Math.PI * .6;
      const a2 = -Math.PI * 3 / 4 + (r.used / 100) * Math.PI * .6;
      const ax1 = x + Math.cos(a1) * armL, ay1 = topY + Math.sin(a1) * armL;
      const ax2 = x + Math.cos(a2) * armL, ay2 = topY + Math.sin(a2) * armL;
      g += `<line x1="${x}" y1="${topY}" x2="${ax1.toFixed(0)}" y2="${ay1.toFixed(0)}" stroke="${tint}" stroke-width="3" stroke-linecap="round"/>`;
      g += `<line x1="${x}" y1="${topY}" x2="${ax2.toFixed(0)}" y2="${ay2.toFixed(0)}" stroke="${tint}" stroke-width="3" stroke-linecap="round"/>`;
      // lamp on top
      const lampY = topY - 12;
      g += `<rect x="${x - 4}" y="${lampY}" width="8" height="8" rx="1" fill="${r.live ? tint : "var(--faint)"}" opacity="${r.live ? 1 : .5}"/>`;
      if (r.err) g += `<circle cx="${x}" cy="${lampY + 4}" r="3" fill="var(--red)"><animate attributeName="opacity" values="1;.2;1" dur=".6s" repeatCount="indefinite"/></circle>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="sm-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "旗语", eyebrow: "QUOTA SEMAPHORE", render };
})();
