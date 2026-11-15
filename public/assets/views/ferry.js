/* ------------------------------------------------------------------- ferry
 * Ferry view — a row of river crossings, one per provider. The
 * barge's position across the water = burn%; figures aboard = live
 * sessions; a snapped rope marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ferry";
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
    const top = rows.slice(0, 4);
    if (!top.length) { host.innerHTML = `<div class="fy-empty">暂无渡口</div>`; return; }

    const pad = 30, crossW = (W - pad * (top.length + 1)) / top.length;
    const bankY = 40, waterY = H * .72;

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water band
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<path d="M ${x} ${waterY + 4} q 6 -5 12 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;
    for (let x = 0; x < W; x += 32) g += `<path d="M ${x} ${waterY + 14} q 8 -6 16 0" stroke="var(--faint)" stroke-width=".7" fill="none" opacity=".35"/>`;

    top.forEach((r, i) => {
      const px = pad + i * (crossW + pad);
      const cx = px + crossW / 2;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // near bank + far bank
      g += `<path d="M ${px} ${waterY} L ${px + 8} ${bankY + 20} L ${px + crossW - 8} ${bankY + 20} L ${px + crossW} ${waterY} Z" fill="var(--card-3)" opacity=".7"/>`;
      g += `<line x1="${px}" y1="${waterY}" x2="${px + crossW}" y2="${waterY}" stroke="var(--line)" stroke-width="1.6"/>`;
      // rope crossing — slack if error
      const sag = r.err ? 12 : 3;
      g += `<path d="M ${px} ${waterY - 6} Q ${cx} ${waterY - 6 + sag} ${px + crossW} ${waterY - 6}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" fill="none" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // barge — position by usage
      const bx = px + 10 + (crossW - 20) * (r.used / 100);
      const by = waterY - 8;
      g += `<g class="fy-barge" style="animation-delay: ${(i * .4).toFixed(1)}s">
        <path d="M ${bx - 18} ${by} L ${bx + 18} ${by} L ${bx + 14} ${by + 8} L ${bx - 14} ${by + 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>
        <rect x="${bx - 12}" y="${by - 6}" width="24" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>
        <!-- figures -->
        ${Array.from({ length: Math.min(3, r.live) }, (_, s) => `<circle cx="${bx - 6 + s * 6}" cy="${by - 8}" r="2.5" fill="${r.col}"/>`).join("")}
      </g>`;
      // marker post on bank
      g += `<line x1="${px + 4}" y1="${waterY}" x2="${px + 4}" y2="${bankY + 12}" stroke="${tint}" stroke-width="2"/>`;
      g += `<text x="${cx}" y="${waterY + 22}" text-anchor="middle" class="fy-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "渡口", eyebrow: "QUOTA FERRY", render };
})();
