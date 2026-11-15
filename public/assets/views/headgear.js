/* ---------------------------------------------------------------- headgear
 * Headgear view — a row of winding towers, one per provider.
 * Cage depth in the shaft = quota burn; a loaded cage at bank for
 * live sessions; a sheave off its groove marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "headgear";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .82;

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
    if (!top.length) { host.innerHTML = `<div class="hg-empty">暂无井架</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="var(--card-2)"/>`;
    // shaft outline below bank
    for (let x = 0; x < W; x += 30) g += `<line x1="${x}" y1="${bankY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".5" opacity=".3"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerW = seg * .55;
      const towerH = 60;
      const towerY = bankY - towerH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // tower legs — A-frame
      g += `<path d="M ${x - towerW / 2} ${bankY} L ${x} ${towerY} L ${x + towerW / 2} ${bankY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" fill="none"/>`;
      g += `<line x1="${x - towerW * .3}" y1="${towerY + towerH * .4}" x2="${x + towerW * .3}" y2="${towerY + towerH * .4}" stroke="${r.col}" stroke-width="1.2" opacity=".6"/>`;
      // sheave wheel at top
      const sheaveR = 8;
      g += `<circle cx="${x}" cy="${towerY - sheaveR}" r="${sheaveR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<circle cx="${x}" cy="${towerY - sheaveR}" r="3" fill="${r.col}" opacity=".6"/>`;
      // rope down to cage
      g += `<line x1="${x}" y1="${towerY - sheaveR}" x2="${x}" y2="${bankY - 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      // cage — depth by quota burn (higher burn = deeper)
      const cageDepth = (r.used / 100) * (bankY - towerY - 20);
      const cageY = bankY - 8 - cageDepth;
      g += `<rect x="${x - 10}" y="${cageY.toFixed(0)}" width="20" height="14" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<line x1="${x - 10}" y1="${(cageY + 7).toFixed(0)}" x2="${x + 10}" y2="${(cageY + 7).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
      // loaded cage at bank for live sessions
      if (r.live) {
        g += `<g class="hg-cage" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + towerW / 2 + 8}" y="${bankY - 18}" width="16" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="${x + towerW / 2 + 12}" cy="${bankY - 12}" r="2.5" fill="${r.col}"/>
          <circle cx="${x + towerW / 2 + 20}" cy="${bankY - 12}" r="2.5" fill="${r.col}"/>
        </g>`;
      }
      // water level in sump
      const sumpY = bankY + 10;
      g += `<rect x="${x - 12}" y="${sumpY.toFixed(0)}" width="24" height="6" fill="${tint}" opacity=".3"/>`;
      g += `<path d="M ${x - 12} ${sumpY.toFixed(0)} q 6 -2 12 0 t 12 0" stroke="${tint}" stroke-width="1" fill="none" opacity=".6"/>`;
      g += `<text x="${x}" y="${bankY + 24}" text-anchor="middle" class="hg-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "井架", eyebrow: "QUOTA HEADGEAR", render };
})();
