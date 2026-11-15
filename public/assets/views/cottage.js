/* ---------------------------------------------------------------- cottage
 * Cottage view — a country house per quota window: warm windows glow
 * with live sessions, a chimney puffs smoke when the provider errs,
 * and a small garden plots the remaining quota.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cottage";
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
    if (!top.length) { host.innerHTML = `<div class="co-empty">暂无配额窗</div>`; return; }

    let g = "";
    const pad = 24, colW = (W - pad * (top.length + 1)) / top.length;
    const ground = H * 0.78;

    top.forEach((r, i) => {
      const x = pad + i * (colW + pad), y = ground - 62;
      const w = colW, h = 62;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // chimney smoke
      if (r.err) {
        for (let s = 0; s < 3; s++) {
          g += `<circle cx="${(x + w * .74).toFixed(0)}" cy="${(y - 14 - s * 12).toFixed(0)}" r="${3 - s * .6}" fill="var(--red)" opacity="${.7 - s * .2}">
            <animate attributeName="cy" values="${(y - 14 - s * 12).toFixed(0)};${(y - 40 - s * 12).toFixed(0)}" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="${.7 - s * .2};0" dur="2.4s" repeatCount="indefinite"/>
          </circle>`;
        }
      }
      // roof + walls
      g += `<path d="M ${x - 4} ${y + 8} L ${x + w / 2} ${y - 20} L ${x + w + 4} ${y + 8} Z" fill="var(--card-2)" stroke="${tint}" stroke-width="1.6"/>`;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--card-2)" stroke="${tint}" stroke-width="1.6"/>`;
      // windows — grid of panes, lit by live sessions
      const panes = 2 + Math.min(4, r.live);
      const pw = (w - 30) / panes;
      for (let p = 0; p < panes; p++) {
        const px = x + 12 + p * (pw + 4);
        const py = y + 10;
        const lit = p < r.live;
        g += `<rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="${pw.toFixed(0)}" height="18" rx="1.5" fill="${lit ? r.col : "var(--line)"}" opacity="${lit ? .9 : .4}"/>`;
        if (lit) g += `<line x1="${px.toFixed(0)}" y1="${py + 9}" x2="${(px + pw).toFixed(0)}" y2="${py + 9}" stroke="var(--bg)" stroke-width=".7" opacity=".5"/>`;
      }
      // garden strip — remaining quota as a flower bed
      const bedH = 14, bedY = y + h - bedH;
      const fill = r.left / 100;
      g += `<rect x="${x + 6}" y="${bedY}" width="${(w - 12) * fill}" height="${bedH - 4}" rx="2" fill="${tint}" opacity=".6"/>`;
      for (let f = 0; f < Math.floor((w - 12) * fill / 9); f++) {
        g += `<circle cx="${(x + 9 + f * 9).toFixed(0)}" cy="${bedY - 3}" r="1.6" fill="${tint}"/>`;
      }
      g += `<text x="${x + w / 2}" y="${ground + 18}" text-anchor="middle" class="co-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="co-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "小屋", eyebrow: "QUOTA COTTAGE", render };
})();
