/* ----------------------------------------------------------------- strand
 * Strand view — a coastline per quota window. Each window bays into the
 * shore; the water inside fills with remaining quota, gulls circle for
 * live sessions, and a black flag marks a window with errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "strand";
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
    if (!top.length) { host.innerHTML = `<div class="st-empty">暂无岸线</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sky stars
    for (let i = 0; i < 16; i++) {
      const sx = (i * 97.3 + 41) % W, sy = 10 + (i * 41.7) % (H * .4);
      g += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${.6 + (i % 3) * .4}" fill="var(--faint)" opacity="${.3 + (i % 4) * .14}"/>`;
    }

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const cx = seg * (i + 1);
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      const bayH = 30 + r.left * .5;   // deeper bay = more remaining
      const bayW = seg * .62;
      const waterY = H * 0.52;
      // shore line curves inward
      g += `<path d="M ${(cx - bayW).toFixed(0)} ${waterY} Q ${cx.toFixed(0)} ${(waterY + bayH).toFixed(0)} ${(cx + bayW).toFixed(0)} ${waterY}" fill="none" stroke="${tint}" stroke-width="2"/>`;
      // water fill inside the bay
      g += `<path d="M ${(cx - bayW + 3).toFixed(0)} ${waterY} Q ${cx.toFixed(0)} ${(waterY + bayH - 4).toFixed(0)} ${(cx + bayW - 3).toFixed(0)} ${waterY} L ${(cx + bayW).toFixed(0)} ${waterY} Z" fill="${tint}" opacity=".45"/>`;
      // small headland either side
      g += `<circle cx="${(cx - bayW - 6).toFixed(0)}" cy="${waterY}" r="4" fill="var(--line)"/>`;
      g += `<circle cx="${(cx + bayW + 6).toFixed(0)}" cy="${waterY}" r="4" fill="var(--line)"/>`;
      // gulls for sessions
      for (let f = 0; f < Math.min(3, r.live); f++) {
        const gx = cx - 14 + f * 14, gy = waterY - 14 - f * 6;
        g += `<path class="st-gull" d="M ${gx} ${gy} q 4 -4 8 0 q 4 -4 8 0" fill="none" stroke="${r.col}" stroke-width="1.2" stroke-linecap="round"/>`;
      }
      // error flag on the headland
      if (r.err) {
        g += `<g transform="translate(${cx + bayW + 6},${waterY - 8})">
          <line x1="0" y1="0" x2="0" y2="-14" stroke="var(--red)" stroke-width="1.4"/>
          <path d="M 0 -14 L 10 -11 L 0 -8 Z" fill="var(--red)"/>
        </g>`;
      }
      g += `<text x="${cx.toFixed(0)}" y="${(waterY + bayH + 18).toFixed(0)}" text-anchor="middle" class="st-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });
    // baseline sea
    g += `<rect y="${H * 0.78}" width="${W}" height="${H - H * 0.78}" fill="var(--card-2)"/>`;
    g += `<line y="${H * 0.78}" x2="${W}" y2="${H * 0.78}" stroke="var(--line)" stroke-width="1.6"/>`;

    host.innerHTML = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海岸", eyebrow: "QUOTA STRAND", render };
})();
