/* ------------------------------------------------------------------- vault
 * Vault view — a row of strongroom doors, one per provider. Door
 * opening = remaining quota; gold bars inside = tokens; a drilled
 * lock plate marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vault";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const wallY = 26, floorY = H * 0.84;

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
    if (!top.length) { host.innerHTML = `<div class="vl-empty">暂无金库</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // wall band
    g += `<rect y="${wallY}" width="${W}" height="${floorY - wallY}" fill="var(--card-2)"/>`;
    g += `<line y="${wallY}" x2="${W}" y2="${wallY}" stroke="var(--line)" stroke-width="1.6"/>`;
    g += `<line y="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1.8"/>`;

    const pad = 24, dw = (W - pad * (top.length + 1)) / top.length;
    top.forEach((r, i) => {
      const px = pad + i * (dw + pad);
      const dh = floorY - wallY - 14;
      const open = r.left / 100;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#c08840" : "#a05830";
      // door frame
      g += `<rect x="${px}" y="${wallY + 7}" width="${dw}" height="${dh}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.6"/>`;
      // door slab — swings open with quota
      const doorW = dw * (.15 + open * .8);
      g += `<rect x="${px + 3}" y="${wallY + 10}" width="${doorW.toFixed(0)}" height="${dh - 6}" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // hinge marks
      g += `<circle cx="${px + 4}" cy="${wallY + 16}" r="2" fill="${r.col}"/>`;
      g += `<circle cx="${px + 4}" cy="${wallY + dh - 4}" r="2" fill="${r.col}"/>`;
      // wheel handle
      const wx = px + doorW * .7, wy = wallY + dh / 2 + 8;
      g += `<circle cx="${wx.toFixed(0)}" cy="${wy.toFixed(0)}" r="6" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2;
        g += `<line x1="${wx.toFixed(0)}" y1="${wy.toFixed(0)}" x2="${(wx + Math.cos(a) * 6).toFixed(0)}" y2="${(wy + Math.sin(a) * 6).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
      }
      // bullion inside — bars stacked when open
      if (open > .15) {
        const barW = doorW * .7, barH = 4;
        for (let b = 0; b < Math.min(3, Math.floor(r.used / 34)); b++) {
          const by = wallY + dh - 6 - b * (barH + 2);
          g += `<rect x="${px + 5}" y="${by.toFixed(0)}" width="${barW.toFixed(0)}" height="${barH}" fill="${tint}" opacity=".8" rx="1"/>`;
        }
      }
      // live indicator — key in lock glowing
      if (r.live) g += `<circle cx="${px + dw - 6}" cy="${wallY + dh / 2 + 8}" r="2.5" fill="${r.col}" opacity=".9"/>`;
      // drilled plate on errors
      if (r.err) g += `<circle cx="${px + dw * .2}" cy="${wallY + dh / 2 + 8}" r="4" fill="none" stroke="var(--red)" stroke-width="1.2" opacity=".8" stroke-dasharray="2 2"/>`;
      g += `<text x="${px + dw / 2}" y="${floorY + 20}" text-anchor="middle" class="vl-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="vl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "金库", eyebrow: "QUOTA VAULT", render };
})();
