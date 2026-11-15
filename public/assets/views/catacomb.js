/* --------------------------------------------------------------- catacomb
 * Catacomb view — a corridor of burial niches, one per quota window.
 * Niche depth = burn%; a candle burns for each live session; a skull
 * mark denotes a window with errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "catacomb";
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
    if (!top.length) { host.innerHTML = `<div class="ct-empty">暂无墓窟</div>`; return; }

    const pad = 26, nicheW = (W - pad * (top.length + 1)) / top.length;
    const floorY = H * 0.84;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ceiling vault
    g += `<path d="M 0 ${floorY - 20} Q ${W / 2} ${floorY - 70} ${W} ${floorY - 20}" stroke="var(--line)" stroke-width="1.6" fill="none"/>`;
    g += `<line y="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1.6"/>`;

    top.forEach((r, i) => {
      const px = pad + i * (nicheW + pad);
      const nicheH = floorY - 60;
      const depth = nicheH * (r.used / 100);
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#e06048" : "#c04028";

      // niche frame
      g += `<rect x="${px}" y="${floorY - nicheH}" width="${nicheW}" height="${nicheH}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // recessed shadow — depth
      g += `<rect x="${px + 4}" y="${floorY - nicheH + 6}" width="${nicheW - 8}" height="${depth.toFixed(0)}" fill="#0d0a08" opacity=".8"/>`;
      // stone sill
      g += `<rect x="${px - 2}" y="${floorY}" width="${nicheW + 4}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // candles on sill for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const cx = px + nicheW / 2 + (s - 1) * 12;
        g += `<g class="ct-candle" style="animation-delay: ${(s * .3).toFixed(1)}s">
          <rect x="${cx - 1.5}" y="${floorY - 8}" width="3" height="8" fill="${r.col}" opacity=".9"/>
          <circle cx="${cx}" cy="${floorY - 12}" r="2.5" fill="${tint}" opacity=".9"/>
        </g>`;
      }
      // skull on errors
      if (r.err) {
        const sx = px + nicheW / 2, sy = floorY - nicheH + 16;
        g += `<g fill="var(--red)" opacity=".8">
          <circle cx="${sx}" cy="${sy}" r="5"/>
          <rect x="${sx - 3}" y="${sy + 3}" width="6" height="3" rx="1"/>
          <circle cx="${sx - 2}" cy="${sy - 1}" r="1" fill="var(--bg)"/>
          <circle cx="${sx + 2}" cy="${sy - 1}" r="1" fill="var(--bg)"/>
        </g>`;
      }
      g += `<text x="${px + nicheW / 2}" y="${floorY + 22}" text-anchor="middle" class="ct-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ct-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "墓窟", eyebrow: "QUOTA CATACOMB", render };
})();
