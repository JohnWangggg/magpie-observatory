/* ----------------------------------------------------------------- cadence
 * Cadence view — a row of metronome pendulums, one per quota window.
 * Swing amplitude = burn%; the bob pulses for live sessions; a red
 * crack on the base marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cadence";
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
    if (!top.length) { host.innerHTML = `<div class="cd-empty">暂无节拍</div>`; return; }

    const pad = 26, bodyW = (W - pad * (top.length + 1)) / top.length;
    const bodyY = 30, bodyH = H * .62;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;

    top.forEach((r, i) => {
      const px = pad + i * (bodyW + pad);
      const cx = px + bodyW / 2;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // wooden case
      g += `<path d="M ${px + 4} ${bodyY + bodyH} L ${cx} ${bodyY} L ${px + bodyW - 4} ${bodyY + bodyH} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // dial arc inside
      const dialR = bodyW * .38;
      const arcY = bodyY + bodyH * .35;
      for (let t = 0; t <= 12; t++) {
        const a = -Math.PI + (t / 12) * Math.PI;
        const x1 = cx + Math.cos(a) * dialR, y1 = arcY + Math.sin(a) * dialR;
        const x2 = cx + Math.cos(a) * (dialR - 8), y2 = arcY + Math.sin(a) * (dialR - 8);
        g += `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="var(--faint)" stroke-width="${t % 3 ? .6 : 1.1}"/>`;
      }
      // pendulum rod — swing amplitude by usage
      const amp = (r.used / 100) * Math.PI * .35;
      const rodLen = bodyH * .62;
      const angle = -Math.PI / 2 + Math.sin(Date.now() / 800 + i) * amp;
      const bx = cx + Math.cos(angle) * rodLen;
      const by = arcY + Math.sin(angle) * rodLen;
      g += `<line x1="${cx}" y1="${arcY}" x2="${bx.toFixed(0)}" y2="${by.toFixed(0)}" stroke="${tint}" stroke-width="2"/>`;
      // bob — glows if live
      g += `<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="7" fill="${r.live ? tint : "var(--card-3)"}" stroke="${r.col}" stroke-width="1.4" opacity="${r.live ? 1 : .6}"/>`;
      if (r.live) g += `<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="3" fill="${r.col}" opacity=".9"/>`;
      // base crack on errors
      if (r.err) g += `<path d="M ${cx - 8} ${bodyY + bodyH - 6} l 4 -8 l 3 6" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${cx}" y="${bodyY + bodyH + 18}" text-anchor="middle" class="cd-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "节奏", eyebrow: "QUOTA CADENCE", render };
})();
