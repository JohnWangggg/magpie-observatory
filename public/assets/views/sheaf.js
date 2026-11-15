/* ------------------------------------------------------------------- sheaf
 * Sheaf view — bound grain bundles on a stubble field, one per quota
 * window. Bundle height = burn%; a sickle gleams for live sessions;
 * a broken stalk marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sheaf";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const fieldY = H * 0.84;

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
    if (!top.length) { host.innerHTML = `<div class="sh-empty">暂无麦捆</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stubble field
    g += `<rect y="${fieldY}" width="${W}" height="${H - fieldY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 14) g += `<line x1="${x}" y1="${fieldY + 4}" x2="${x + 3}" y2="${fieldY - 2}" stroke="var(--faint)" stroke-width=".8" opacity=".5"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const bundleH = 40 + (r.used / 100) * 56;
      const baseY = fieldY;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#c08840" : "#a05830";
      // bundle — tapered sheaf shape
      g += `<path d="M ${x - 12} ${baseY} L ${x - 6} ${baseY - bundleH} L ${x} ${baseY - bundleH - 6} L ${x + 6} ${baseY - bundleH} L ${x + 12} ${baseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // stalks inside
      for (let s = 0; s < 5; s++) {
        const sx = x - 8 + s * 4;
        g += `<line x1="${sx.toFixed(0)}" y1="${baseY - 4}" x2="${(sx + (s - 2) * .8).toFixed(0)}" y2="${(baseY - bundleH + 8).toFixed(0)}" stroke="${tint}" stroke-width=".8" opacity=".6"/>`;
      }
      // ear heads
      for (let s = 0; s < 5; s++) {
        const ex = x - 6 + s * 3;
        g += `<ellipse cx="${ex.toFixed(0)}" cy="${(baseY - bundleH - 4 - (s % 2) * 4).toFixed(0)}" rx="2" ry="4" fill="${tint}" opacity=".8"/>`;
      }
      // binding band
      g += `<ellipse cx="${x}" cy="${baseY - bundleH * .4}" rx="13" ry="3" fill="none" stroke="${r.col}" stroke-width="1.6"/>`;
      // sickle for live sessions
      if (r.live) {
        const sx = x + 14, sy = baseY - 8;
        g += `<g class="sh-sickle" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${sx} ${sy} Q ${sx + 14} ${sy - 10} ${sx + 10} ${sy - 20}" stroke="${r.col}" stroke-width="2" fill="none"/>
          <line x1="${sx + 10}" y1="${sy - 20}" x2="${sx + 16}" y2="${sy - 14}" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // broken stalk for errors
      if (r.err) g += `<path d="M ${x - 8} ${baseY - bundleH * .3} l -6 -10 l 3 -4" stroke="var(--red)" stroke-width="1.4" fill="none" opacity=".9"/>`;
      g += `<text x="${x}" y="${fieldY + 18}" text-anchor="middle" class="sh-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "麦捆", eyebrow: "QUOTA SHEAF", render };
})();
