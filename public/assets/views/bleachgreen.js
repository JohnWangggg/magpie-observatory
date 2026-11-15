/* --------------------------------------------------------------- bleachgreen
 * Bleachgreen view — a row of grassing fields, one per provider.
 * Webs spread to whiten = tokens; a whitster turning cloth
 * for live sessions; a scorched piece marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bleachgreen";
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
    if (!rows.length) { host.innerHTML = `<div class="bgl-empty">暂无漂白场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // green field
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const linen = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0ead8" : "#c8c0a8";
      const fieldW = seg * .5;
      const fieldY = floorY - 26;
      // the green — a grassed patch
      g += `<rect x="${x - fieldW / 2}" y="${fieldY}" width="${fieldW}" height="${floorY - fieldY}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // grass tufts
      for (let t = 0; t < 4; t++) {
        g += `<path d="M ${x - fieldW * .4 + t * fieldW * .25} ${floorY - 4} q 1 -4 2 0" fill="none" stroke="${r.col}" stroke-width=".6" opacity=".5"/>`;
      }
      // webs — linen pieces spread to whiten, count by tokens
      const webs = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let w = 0; w < webs; w++) {
        const wx = x - fieldW * .38 + (w % 2) * fieldW * .4;
        const wy = fieldY + 4 + Math.floor(w / 2) * 9;
        g += `<rect x="${wx}" y="${wy}" width="${fieldW * .34}" height="7" rx="1" fill="${w === 0 && r.err ? "var(--red)" : linen}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<line x1="${wx}" y1="${wy + 3}" x2="${wx + fieldW * .34}" y2="${wy + 3}" stroke="${r.col}" stroke-width=".4" opacity=".4"/>`;
      }
      // the bucking basket — a creel at the field edge
      g += `<ellipse cx="${x + fieldW * .44}" cy="${floorY - 10}" rx="4" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + fieldW * .44 - 4}" y1="${floorY - 10}" x2="${x + fieldW * .44 + 4}" y2="${floorY - 10}" stroke="${r.col}" stroke-width=".5"/>`;
      // sun overhead — the bleaching agent
      g += `<circle cx="${x}" cy="${fieldY - 12}" r="4" fill="#f0d880" stroke="${r.col}" stroke-width=".8"/>`;
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g += `<line x1="${x + Math.cos(a) * 5}" y1="${fieldY - 12 + Math.sin(a) * 5}" x2="${x + Math.cos(a) * 8}" y2="${fieldY - 12 + Math.sin(a) * 8}" stroke="#f0d880" stroke-width=".9"/>`;
      }
      // whitster turning cloth for live sessions — kneeling figure
      if (r.live) {
        g += `<g class="bgl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - fieldW * .44} ${floorY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="13" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // scorched piece — a burn mark on errors
      if (r.err) g += `<path d="M ${x + fieldW * .1} ${fieldY + 6} q 4 3 0 6" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bgl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bgl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "漂青场", eyebrow: "PROVIDER BLEACHGREEN", render };
})();
