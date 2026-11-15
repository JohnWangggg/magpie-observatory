/* --------------------------------------------------------------- flotilla
 * Flotilla view — every live session is a small boat bobbing on the
 * water. Hull size tracks session tokens; the wake behind each hull
 * ripples; an error flags a red sail on that boat.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "flotilla";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * 0.72;

    const rows = sessions.slice(0, 8).map(s => ({
      s, tok: s.tokens || 0, err: logs.slice(-30).some(l => l.provider === s.provider && l.status === "err"),
      col: metaOf(s.provider).color || "#8b7cf6",
    }));

    if (!rows.length) { host.innerHTML = `<div class="fl-empty">暂无船</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // water gradient band
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    g += `<line y="${waterY}" x2="${W}" y2="${waterY}" stroke="var(--line)" stroke-width="1.6"/>`;
    // waterline ripples
    for (let x = 0; x < W; x += 40) {
      g += `<path d="M ${x} ${waterY} q 10 -3 20 0 q 10 -3 20 0" fill="none" stroke="var(--faint)" stroke-width=".6" opacity=".5"/>`;
    }
    // clouds / stars
    for (let i = 0; i < 6; i++) {
      const cx = (i * 143 + 40) % W, cy = 16 + (i * 37) % 50;
      g += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${20 + (i % 3) * 8}" ry="${5 + (i % 2) * 2}" fill="var(--faint)" opacity=".25"/>`;
    }

    const pad = 36;
    rows.forEach((r, i) => {
      const x = pad + i * ((W - 2 * pad) / Math.max(1, rows.length - 1 || 1));
      const y = waterY - 8 - (i % 2) * 14;
      const hullL = 34 + Math.min(30, r.tok / 5000);
      const col = r.err ? "#e06048" : r.col;
      // boat: curved hull + sail triangle
      g += `<g class="fl-boat" style="transform-origin: ${x + hullL / 2}px ${y + 8}px; animation-duration: ${(1.4 + (i % 3) * .4).toFixed(2)}s;">
        <path d="M ${x.toFixed(0)} ${y} Q ${(x + hullL * .12).toFixed(0)} ${y + 10} ${(x + hullL * .5).toFixed(0)} ${y + 10} Q ${(x + hullL * .88).toFixed(0)} ${y + 10} ${(x + hullL).toFixed(0)} ${y} L ${(x + hullL - 5).toFixed(0)} ${y + 3} L ${x + 5} ${y + 3} Z" fill="var(--card-2)" stroke="${col}" stroke-width="1.4"/>
        <line x1="${(x + hullL / 2).toFixed(0)}" y1="${y}" x2="${(x + hullL / 2).toFixed(0)}" y2="${y - 22}" stroke="${col}" stroke-width="1.4"/>
        <path d="M ${(x + hullL / 2).toFixed(0)} ${y - 22} L ${(x + hullL / 2 + 12).toFixed(0)} ${y - 6} L ${(x + hullL / 2).toFixed(0)} ${y - 6} Z" fill="${col}" opacity=".85"/>
      </g>`;
      // wake behind
      g += `<path d="M ${(x - hullL * .3).toFixed(0)} ${y + 5} q 4 -2 8 0 q 4 -2 8 0 q 4 -2 8 0" fill="none" stroke="${col}" stroke-width=".6" opacity=".5"/>`;
      // agent label
      g += `<text x="${(x + hullL / 2).toFixed(0)}" y="${y + 28}" text-anchor="middle" class="fl-lab">${esc((r.s.agent || r.s.provider || "?").split("/").pop().slice(0, 9))} ${(r.tok / 1000).toFixed(0)}k</text>`;
    });

    host.innerHTML = `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "船队", eyebrow: "AGENT FLOTILLA", render };
})();
