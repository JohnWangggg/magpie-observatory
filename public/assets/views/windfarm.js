/* ---------------------------------------------------------------- windfarm
 * Windfarm view — a ridge of three-blade turbines, one per provider.
 * Rotor speed = request rate; nacelle glows with tokens; a red stripe
 * on the tower marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "windfarm";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const hillY = H * 0.84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="wf-empty">暂无风机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // hill
    g += `<path d="M 0 ${hillY} Q ${W / 2} ${hillY - 30} ${W} ${hillY}" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const towerH = 50 + (r.tok / maxTok) * 50;
      const baseY = hillY - 8;
      const topY = baseY - towerH;
      const bladeLen = 14 + (r.tok / maxTok) * 12;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68c078" : "#e8c860";
      const speed = Math.max(1, 6 - r.tok / maxTok * 4);
      // tower
      g += `<line x1="${x}" y1="${baseY}" x2="${x}" y2="${topY}" stroke="${r.col}" stroke-width="2.4"/>`;
      // nacelle
      g += `<rect x="${x - 4}" y="${topY - 4}" width="8" height="6" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // rotor — three blades
      g += `<g class="wf-rotor" style="transform-origin: ${x}px ${topY}px; animation-duration: ${speed.toFixed(1)}s">
        ${[0, 120, 240].map(a => {
          const rad = a * Math.PI / 180;
          const bx = x + Math.cos(rad) * bladeLen, by = topY + Math.sin(rad) * bladeLen;
          return `<line x1="${x}" y1="${topY}" x2="${bx.toFixed(0)}" y2="${by.toFixed(0)}" stroke="${tint}" stroke-width="2" stroke-linecap="round"/>`;
        }).join("")}
      </g>`;
      // error stripe on tower
      if (r.err) g += `<line x1="${x - 2}" y1="${topY + 8}" x2="${x - 2}" y2="${baseY - 4}" stroke="var(--red)" stroke-width="1.4" opacity=".8"/>`;
      g += `<text x="${x}" y="${hillY + 20}" text-anchor="middle" class="wf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "风电场", eyebrow: "PROVIDER WINDFARM", render };
})();
