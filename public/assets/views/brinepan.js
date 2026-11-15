/* ------------------------------------------------------------------ brinepan
 * Brinepan view — a row of boiling brine pans over furnaces,
 * one per provider. Salt crystals crusting the edge = tokens;
 * a panman skimming the scum for live sessions; a boiled-dry
 * crust marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brinepan";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bp-empty">暂无煮盐盘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // salt-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const panW = seg * .66;
      const panH = 16;
      const panY = floorY - panH - 12;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8e8e8" : "#b8b8b0";
      // furnace arch under the pan
      g += `<rect x="${x - panW / 2 - 6}" y="${panY + panH}" width="${panW + 12}" height="12" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<path d="M ${x - 6} ${panY + panH + 12} v -6 a 6 6 0 0 1 12 0 v 6 Z" fill="${r.live ? "#e08040" : "var(--card-2)"}" stroke="${r.col}" stroke-width=".9"/>`;
      // pan body — shallow iron pan
      g += `<rect x="${x - panW / 2}" y="${panY}" width="${panW}" height="${panH}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // brine inside — depth by tokens
      const brineH = 3 + (r.tok / maxTok) * (panH - 8);
      g += `<rect x="${x - panW / 2 + 2}" y="${(panY + panH - 2 - brineH).toFixed(0)}" width="${panW - 4}" height="${brineH.toFixed(0)}" fill="#7a88b8" opacity=".5"/>`;
      // salt crust on the rim — thickness by tokens
      const crustW = Math.min(4, r.tok / maxTok * 4);
      g += `<rect x="${x - panW / 2}" y="${panY - crustW.toFixed(1)}" width="${panW}" height="${crustW.toFixed(1)}" fill="${tint}" opacity=".8" rx="1"/>`;
      // steam wisps
      for (let s = 0; s < 2; s++) {
        g += `<path class="bp-steam" style="animation-delay: ${((i + s) * .3).toFixed(1)}s" d="M ${x - 8 + s * 16} ${panY - 4} q 3 -6 -2 -12" stroke="${r.col}" stroke-width="1" fill="none" opacity=".4"/>`;
      }
      // panman skimming for live sessions
      if (r.live) {
        g += `<g class="bp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + panW / 2 + 10} ${panY - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-14" y2="6" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="-14" cy="6" r="1.5" fill="${tint}"/>
        </g>`;
      }
      // boiled-dry — a crack in the dry crust on errors
      if (r.err) g += `<path d="M ${x - 6} ${panY + 4} l 6 4 l -6 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "煮盐盘", eyebrow: "PROVIDER BRINEPAN", render };
})();
