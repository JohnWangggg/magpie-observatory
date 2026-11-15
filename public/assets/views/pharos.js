/* ------------------------------------------------------------------ pharos
 * Pharos view — a line of ancient lighthouses, one per quota window.
 * Tower height tracks tokens burned; a rotating beam sweeps while the
 * provider is live, and the lamp dims as quota runs out.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pharos";
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
    if (!top.length) { host.innerHTML = `<div class="ph-empty">暂无灯塔</div>`; return; }

    const seaY = H * 0.86;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sea
    g += `<rect y="${seaY}" width="${W}" height="${H - seaY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 28) g += `<path d="M ${x} ${seaY + 6} q 7 -5 14 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerH = 50 + (r.used / 100) * (seaY - 70);
      const baseY = seaY;
      const lampY = baseY - towerH;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#e06048" : "#a03028";
      // tower
      g += `<path d="M ${x - 14} ${baseY} L ${x - 9} ${lampY} L ${x + 9} ${lampY} L ${x + 14} ${baseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // lamp room
      g += `<rect x="${x - 11}" y="${lampY - 12}" width="22" height="12" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // rotating beam (when live)
      if (r.live) {
        const beamLen = 90 + r.live * 15;
        g += `<g class="ph-beam" style="transform-origin: ${x}px ${lampY - 6}px; animation-duration: ${Math.max(1.6, 4 - r.used * .03).toFixed(2)}s;">
          <path d="M ${x} ${lampY - 6} L ${x + beamLen} ${lampY - 20} L ${x + beamLen} ${lampY + 4} Z" fill="${tint}" opacity=".28"/>
          <path d="M ${x} ${lampY - 6} L ${x - beamLen} ${lampY - 20} L ${x - beamLen} ${lampY + 4} Z" fill="${tint}" opacity=".28"/>
        </g>`;
      }
      // lamp dot — brighter when live
      g += `<circle cx="${x}" cy="${lampY - 6}" r="${r.live ? 4.5 : 3}" fill="${r.live ? tint : "var(--faint)"}" opacity="${r.live ? 1 : .5}"/>`;
      // error flag
      if (r.err) g += `<path d="M ${x - 11} ${lampY - 12} l -6 4 l 6 4 z" fill="var(--red)"/>`;
      g += `<text x="${x}" y="${seaY + 26}" text-anchor="middle" class="ph-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯塔", eyebrow: "QUOTA PHAROS", render };
})();
