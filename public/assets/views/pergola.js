/* ----------------------------------------------------------------- pergola
 * Pergola view — a garden walk of arched trellises, one per quota
 * window. Vine coverage = burn%; a bench sits beneath for live
 * sessions; a snapped rafter marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pergola";
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
    if (!top.length) { host.innerHTML = `<div class="pg-empty">暂无藤架</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // path
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 18) g += `<rect x="${x}" y="${groundY + 4}" width="10" height="3" fill="var(--line)" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const archH = 44 + (r.used / 100) * 46;
      const archW = seg * .56;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#a08830" : "#a05830";
      // posts
      g += `<line x1="${x - archW / 2}" y1="${groundY}" x2="${x - archW / 2}" y2="${groundY - archH}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${x + archW / 2}" y1="${groundY}" x2="${x + archW / 2}" y2="${groundY - archH}" stroke="${r.col}" stroke-width="2.4"/>`;
      // arch top
      g += `<path d="M ${x - archW / 2} ${groundY - archH} Q ${x} ${groundY - archH - 18} ${x + archW / 2} ${groundY - archH}" fill="none" stroke="${r.col}" stroke-width="2"/>`;
      // rafters across
      for (let t = 0; t < 4; t++) {
        const ty = groundY - archH + t * (archH / 4);
        g += `<line x1="${x - archW * .48}" y1="${ty.toFixed(0)}" x2="${x + archW * .48}" y2="${ty.toFixed(0)}" stroke="${r.col}" stroke-width=".8" opacity=".5"/>`;
      }
      // vine coverage — leaves along arch
      const cover = r.used / 100;
      const leaves = Math.floor(cover * 10);
      for (let l = 0; l < leaves; l++) {
        const t = l / 10;
        const lx = x - archW / 2 + t * archW;
        const ly = groundY - archH - Math.sin(t * Math.PI) * 14;
        g += `<ellipse cx="${lx.toFixed(0)}" cy="${ly.toFixed(0)}" rx="3.5" ry="2" fill="${tint}" opacity=".8"/>`;
      }
      // bench beneath for live sessions
      if (r.live) {
        g += `<g class="pg-bench" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - 10}" y="${groundY - 8}" width="20" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="${x - 6}" y1="${groundY - 8}" x2="${x - 6}" y2="${groundY}" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="${x + 6}" y1="${groundY - 8}" x2="${x + 6}" y2="${groundY}" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // snapped rafter on errors
      if (r.err) g += `<line x1="${x - archW * .2}" y1="${groundY - archH - 6}" x2="${x + archW * .15}" y2="${groundY - archH + 8}" stroke="var(--red)" stroke-width="1.6" opacity=".8"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="pg-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "藤架", eyebrow: "QUOTA PERGOLA", render };
})();
