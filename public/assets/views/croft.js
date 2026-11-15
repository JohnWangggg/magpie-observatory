/* ------------------------------------------------------------------- croft
 * Croft view — a smallholding of ridge-and-furrow strips, one per
 * quota window. Furrow depth scales with tokens burned; sheep dot the
 * lea for live sessions; a storm cloud broods over error windows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "croft";
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
    if (!top.length) { host.innerHTML = `<div class="cr-empty">暂无田亩</div>`; return; }

    const pad = 24, fieldW = (W - pad * (top.length + 1)) / top.length;
    const fieldY = 34, fieldH = H * .62;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect x="${pad}" y="${fieldY}" width="${W - pad * 2}" height="${fieldH}" fill="var(--card-2)" rx="4" stroke="var(--line)" stroke-width="1"/>`;

    top.forEach((r, i) => {
      const fx = pad + i * (fieldW + pad);
      const furrows = 4 + Math.floor(r.used / 20);
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // ridge + furrow stripes
      for (let f = 0; f < furrows; f++) {
        const fy = fieldY + (f + .5) * fieldH / furrows;
        g += `<line x1="${fx + 4}" y1="${fy.toFixed(0)}" x2="${fx + fieldW - 4}" y2="${fy.toFixed(0)}" stroke="${r.col}" stroke-width="1.6" opacity=".45"/>`;
        g += `<line x1="${fx + 4}" y1="${(fy + 2).toFixed(0)}" x2="${fx + fieldW - 4}" y2="${(fy + 2).toFixed(0)}" stroke="var(--line)" stroke-width=".8" opacity=".4"/>`;
      }
      // boundary bank on the right
      g += `<line x1="${fx + fieldW - 2}" y1="${fieldY}" x2="${fx + fieldW - 2}" y2="${fieldY + fieldH}" stroke="${r.col}" stroke-width="2" opacity=".6"/>`;
      // sheep — small ovals for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const sx = fx + fieldW * .3 + (s * fieldW * .18), sy = fieldY + fieldH * (.25 + s * .2);
        g += `<g class="cr-sheep" style="animation-delay: ${(s * .5).toFixed(1)}s">
          <ellipse cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" rx="5" ry="3.5" fill="var(--fg-2)" opacity=".85"/>
          <circle cx="${(sx - 5).toFixed(0)}" cy="${(sy - 2).toFixed(0)}" r="2" fill="var(--fg-2)"/>
        </g>`;
      }
      // storm cloud on errors
      if (r.err) {
        const cx = fx + fieldW / 2, cy = fieldY - 8;
        g += `<g fill="var(--red)" opacity=".7">
          <ellipse cx="${cx - 8}" cy="${cy}" rx="10" ry="6"/>
          <ellipse cx="${cx + 8}" cy="${cy - 2}" rx="9" ry="5"/>
          <ellipse cx="${cx}" cy="${cy - 4}" rx="7" ry="4"/>
        </g>`;
        g += `<line x1="${cx}" y1="${cy + 4}" x2="${cx - 4}" y2="${fieldY + 4}" stroke="var(--red)" stroke-width="1.4" opacity=".7"/>`;
      }
      g += `<text x="${fx + fieldW / 2}" y="${fieldY + fieldH + 20}" text-anchor="middle" class="cr-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "小农场", eyebrow: "QUOTA CROFT", render };
})();
