/* ------------------------------------------------------------------ doocot
 * Doocot view — a stone dovecote per quota window. Nest holes glow
 * with remaining quota; doves flutter for live sessions; a dropped
 * tile marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "doocot";
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
    if (!top.length) { host.innerHTML = `<div class="dc-empty">暂无鸽舍</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const coteH = 46 + (r.used / 100) * 44;
      const coteW = 30 + (r.used / 100) * 14;
      const baseY = groundY;
      const topY = baseY - coteH;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#c08840" : "#a05830";
      // stone tower
      g += `<rect x="${x - coteW / 2}" y="${topY}" width="${coteW}" height="${coteH}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4" rx="2"/>`;
      // slate cap
      g += `<path d="M ${x - coteW * .6} ${topY} L ${x} ${topY - 12} L ${x + coteW * .6} ${topY} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // nest holes — grid of openings, lit with quota
      const cols = 3, rows2 = 4;
      for (let rr = 0; rr < rows2; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          const hx = x - coteW * .3 + cc * (coteW * .3);
          const hy = topY + 8 + rr * ((coteH - 20) / rows2);
          const lit = rr < Math.ceil((r.left / 100) * rows2);
          g += `<rect x="${(hx - 2).toFixed(0)}" y="${hy.toFixed(0)}" width="4" height="5" rx="1" fill="${lit ? tint : "#1a1410"}" opacity="${lit ? .8 : .9}"/>`;
        }
      }
      // doves circling for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const dx = x + Math.cos(s * 2.2 + Date.now() / 900) * (coteW + 12);
        const dy = topY + 10 + Math.sin(s * 2.2 + Date.now() / 900) * 8;
        g += `<ellipse cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" rx="4" ry="2.2" fill="${r.col}" opacity=".85"/>`;
      }
      // dropped tile on errors
      if (r.err) g += `<path d="M ${x - coteW * .2} ${topY + 4} l 6 10 l -8 2 Z" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="dc-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鸽舍", eyebrow: "QUOTA DOOCOT", render };
})();
