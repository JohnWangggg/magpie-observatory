/* ------------------------------------------------------------------ gnomon
 * Gnomon view — a stone dial per quota window. The shadow sweeps
 * clockwise with tokens consumed; live sessions are birds perched on
 * the gnomon tip; a red hairline marks windows running errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gnomon";
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
    if (!top.length) { host.innerHTML = `<div class="gn-empty">暂无晷盘</div>`; return; }

    const pad = 30, dR = Math.min(54, (W - pad * (top.length + 1)) / top.length / 2);
    const cy = H * 0.58;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;

    top.forEach((r, i) => {
      const x = pad + i * (dR * 2 + pad) + dR;
      const used = r.used / 100;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // dial face
      g += `<circle cx="${x}" cy="${cy}" r="${dR}" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.4"/>`;
      // hour ticks
      for (let t = 0; t < 12; t++) {
        const a = (t / 12) * Math.PI * 2 - Math.PI / 2;
        const x1 = x + Math.cos(a) * (dR - 6), y1 = cy + Math.sin(a) * (dR - 6);
        const x2 = x + Math.cos(a) * (dR - 12), y2 = cy + Math.sin(a) * (dR - 12);
        g += `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="var(--faint)" stroke-width="${t % 3 ? .7 : 1.3}"/>`;
      }
      // shadow arc — wedge from centre to rim
      const arcA = -Math.PI / 2 + used * Math.PI * 2;
      const ax = x + Math.cos(arcA) * dR, ay = cy + Math.sin(arcA) * dR;
      g += `<path d="M ${x} ${cy} L ${(x - dR * .98).toFixed(0)} ${cy} A ${dR} ${dR} 0 ${used > .5 ? 1 : 0} 1 ${ax.toFixed(0)} ${ay.toFixed(0)} Z" fill="${tint}" opacity=".3"/>`;
      // gnomon — triangle from centre
      const gx = x, gy = cy - dR * .85;
      g += `<path d="M ${x} ${cy} L ${(x + dR * .18).toFixed(0)} ${gy.toFixed(0)} L ${(x - dR * .18).toFixed(0)} ${gy.toFixed(0)} Z" fill="${r.col}" opacity=".9"/>`;
      // shadow line from gnomon tip along arc direction
      const sx = x + Math.cos(arcA) * (dR * .8), sy = cy + Math.sin(arcA) * (dR * .8);
      g += `<line x1="${x}" y1="${gy.toFixed(0)}" x2="${sx.toFixed(0)}" y2="${sy.toFixed(0)}" stroke="${tint}" stroke-width="2" opacity=".8"/>`;
      // birds on gnomon tip for live sessions
      for (let s = 0; s < Math.min(2, r.live); s++) {
        const bx = x + (s - .5) * 10, by = gy - 6;
        g += `<g class="gn-bird" style="animation-delay: ${(s * .35).toFixed(1)}s">
          <ellipse cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" rx="3.5" ry="2" fill="${r.col}"/>
          <path d="M ${bx - 3} ${by} l -3 -2 l .8 3 z" fill="${r.col}"/>
        </g>`;
      }
      // error hairline
      if (r.err) g += `<circle cx="${x}" cy="${cy}" r="${dR + 4}" fill="none" stroke="var(--red)" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>`;
      g += `<text x="${x}" y="${cy + dR + 18}" text-anchor="middle" class="gn-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "晷针", eyebrow: "QUOTA GNOMON", render };
})();
