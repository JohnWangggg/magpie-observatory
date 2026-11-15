/* --------------------------------------------------------------- paperpress
 * Paperpress view — a row of screw presses, one per provider.
 * Posts of wet paper pressed out = tokens; a coucher laying a
 * fresh sheet for live sessions; a wrinkled post marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "paperpress";
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
    if (!rows.length) { host.innerHTML = `<div class="pp-empty">暂无压纸坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mill floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const sheet = r.err ? "#e06048" : "#f0ece0";
      const pressW = seg * .55;
      const bedY = floorY - 18;
      // the press — two posts with a platen and screw
      g += `<line x1="${x - pressW * .3}" y1="${bedY + 18}" x2="${x - pressW * .3}" y2="${bedY - 20}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + pressW * .3}" y1="${bedY + 18}" x2="${x + pressW * .3}" y2="${bedY - 20}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - pressW * .34}" y1="${bedY - 20}" x2="${x + pressW * .34}" y2="${bedY - 20}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x}" y1="${bedY - 20}" x2="${x}" y2="${bedY - 4}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<rect x="${x - 10}" y="${bedY - 4}" width="20" height="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // post of wet paper on the bed — sheets by tokens
      const sheets = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < sheets; s++) {
        g += `<rect x="${x - pressW * .22}" y="${bedY - s * 2.4}" width="${pressW * .44}" height="2" rx=".6" fill="${s === sheets - 1 && r.err ? "var(--red)" : sheet}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // felt pads between
      g += `<line x1="${x - pressW * .22}" y1="${bedY - sheets * 2.4}" x2="${x + pressW * .22}" y2="${bedY - sheets * 2.4}" stroke="#b09868" stroke-width="1.2"/>`;
      // pressed sheets beside — a dried stack
      const stack = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let s = 0; s < stack; s++) {
        g += `<rect x="${x + pressW * .36}" y="${floorY - 4 - s * 5}" width="12" height="4" fill="${sheet}" stroke="${r.col}" stroke-width=".6" opacity=".9"/>`;
      }
      // coucher laying a sheet for live sessions — arms over the post
      if (r.live) {
        g += `<g class="pp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pressW * .34 - 8} ${bedY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="4" y="6" width="10" height="4" rx="1" fill="${sheet}" stroke="${r.col}" stroke-width=".7"/>
        </g>`;
      }
      // wrinkled post — a rucked sheet on errors
      if (r.err) g += `<path d="M ${x - pressW * .1} ${bedY - sheets * 2.4 + 1} q 4 -3 8 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="pp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "压纸坊", eyebrow: "PROVIDER PAPERPRESS", render };
})();
