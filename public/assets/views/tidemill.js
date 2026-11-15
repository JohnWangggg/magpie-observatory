/* ---------------------------------------------------------------- tidemill
 * Tidemill view — a row of water wheels on a stream, one per quota
 * window. Wheel size scales with remaining quota; rotation speed =
 * burn%; live sessions are fish leaping beside the wheel.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tidemill";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 4);
    if (!top.length) { host.innerHTML = `<div class="tm-empty">暂无磨坊</div>`; return; }

    const streamY = H * 0.78;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stream
    g += `<rect y="${streamY}" width="${W}" height="${H - streamY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<path d="M ${x} ${streamY + 5} q 7 -6 14 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;
    // mill house silhouettes behind
    for (let i = 0; i <= top.length; i++) {
      const hx = (W / top.length) * i;
      g += `<rect x="${hx - 20}" y="${streamY - 34}" width="40" height="34" fill="var(--card-3)" stroke="var(--line)" stroke-width="1" opacity=".6"/>`;
    }

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const wheelR = 18 + (r.left / 100) * 24;
      const cy = streamY - wheelR * .4;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      const speed = Math.max(1.4, 8 - r.used * .06);
      // wheel rim + spokes
      g += `<g class="tm-wheel" style="transform-origin: ${x}px ${cy.toFixed(0)}px; animation-duration: ${speed.toFixed(1)}s">
        <circle cx="${x}" cy="${cy.toFixed(0)}" r="${wheelR.toFixed(0)}" fill="none" stroke="${r.col}" stroke-width="2"/>
        <circle cx="${x}" cy="${cy.toFixed(0)}" r="5" fill="none" stroke="${r.col}" stroke-width="1.4"/>
        ${[0, 60, 120].map(a => {
          const rad = a * Math.PI / 180;
          const x1 = x + Math.cos(rad) * wheelR, y1 = cy + Math.sin(rad) * wheelR;
          const x2 = x - Math.cos(rad) * wheelR, y2 = cy - Math.sin(rad) * wheelR;
          return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${r.col}" stroke-width="1.2"/>`;
        }).join("")}
      </g>`;
      // axle mount to bank
      g += `<line x1="${x}" y1="${cy.toFixed(0)}" x2="${x}" y2="${streamY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // fish leaping for live sessions
      for (let s = 0; s < Math.min(2, r.live); s++) {
        const fx = x + wheelR + 8 + s * 14, fy = streamY - 4;
        g += `<g class="tm-fish" style="animation-delay: ${(s * .5).toFixed(1)}s">
          <ellipse cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" rx="5" ry="2.5" fill="${r.col}" opacity=".9"/>
          <path d="M ${fx - 5} ${fy} l -4 -3 l 1.5 4 z" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x}" y="${streamY + 26}" text-anchor="middle" class="tm-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}</text>`;
    });

    host.innerHTML = `<svg class="tm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潮汐磨坊", eyebrow: "QUOTA TIDEMILL", render };
})();
