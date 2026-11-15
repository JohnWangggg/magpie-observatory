/* --------------------------------------------------------------- stampmill
 * Stampmill view — a row of battery frames with drop stamps,
 * one per provider. Head lift height = tokens; a millman
 * shovelling ore at the mortar for live sessions; a thrown
 * tappet marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stampmill";
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
    if (!rows.length) { host.innerHTML = `<div class="sm-empty">暂无捣矿磨</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mill floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const frameW = seg * .55;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const frameTop = floorY - 52;
      // battery frame — two uprights + headstock
      g += `<rect x="${x - frameW / 2}" y="${frameTop}" width="6" height="52" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x + frameW / 2 - 6}" y="${frameTop}" width="6" height="52" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - frameW / 2 - 2}" y="${frameTop - 6}" width="${frameW + 4}" height="8" rx="1" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // cam shaft under the headstock
      g += `<circle cx="${x}" cy="${frameTop - 10}" r="5" fill="none" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<path d="M ${x - 5} ${frameTop - 10} l 10 -4" stroke="${r.col}" stroke-width="1.2"/>`;
      // stamps — stem count 2, lift height by tokens
      const lift = 4 + (r.tok / maxTok) * 14;
      for (let s = -1; s <= 1; s += 2) {
        const sx = x + s * frameW * .18;
        g += `<line x1="${sx.toFixed(0)}" y1="${frameTop + 2}" x2="${sx.toFixed(0)}" y2="${floorY - 14 - lift}" stroke="${r.col}" stroke-width="2"/>`;
        g += `<rect x="${sx.toFixed(0) - 3}" y="${(floorY - 14 - lift).toFixed(0)}" width="6" height="8" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // mortar box at the floor
      g += `<rect x="${x - frameW * .32}" y="${floorY - 14}" width="${frameW * .64}" height="10" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // ore heap beside the mortar
      g += `<path d="M ${x - frameW * .5} ${floorY} q 6 -8 14 0 Z" fill="${tint}" opacity=".7"/>`;
      // sluice flow off the mortar
      g += `<line x1="${x + frameW * .32}" y1="${floorY - 8}" x2="${x + frameW * .44}" y2="${floorY - 2}" stroke="var(--line)" stroke-width="1" opacity=".6"/>`;
      // millman shovelling ore for live sessions
      if (r.live) {
        g += `<g class="sm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + frameW / 2 + 10} ${floorY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="4" x2="-12" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // thrown tappet — a broken cam lobe on errors
      if (r.err) g += `<path d="M ${x + 4} ${frameTop - 14} l 6 -4 l -6 -2" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "捣矿磨", eyebrow: "PROVIDER STAMPMILL", render };
})();
