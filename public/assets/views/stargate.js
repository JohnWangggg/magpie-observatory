/* --------------------------------------------------------------- stargate
 * Stargate view — concentric gate rings zoom outward forever. Each
 * quota window is a ring: radius contracts with remaining quota, its
 * rim lights when the provider is live, errors pulse a red ripple.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stargate";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) / 2 - 14;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 6);
    if (!top.length) { host.innerHTML = `<div class="sg-empty">暂无星门</div>`; return; }

    let g = `<circle cx="${cx}" cy="${cy}" r="${maxR}" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.6"/>`;
    // chevrons around the rim
    for (let c = 0; c < 9; c++) {
      const a = (c / 9) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * (maxR - 8), y1 = cy + Math.sin(a) * (maxR - 8);
      const x2 = cx + Math.cos(a) * (maxR - 16), y2 = cy + Math.sin(a) * (maxR - 16);
      g += `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="var(--faint)" stroke-width="1.4"/>`;
    }

    top.forEach((r, i) => {
      const frac = (top.length - i) / top.length;
      const ringR = maxR * (0.2 + frac * 0.72);
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      const thick = r.live ? 2.6 : 1.4;
      const alpha = r.err ? .9 : .6;
      g += `<circle cx="${cx}" cy="${cy}" r="${ringR.toFixed(0)}" fill="none" stroke="${r.err ? "var(--red)" : tint}" stroke-width="${thick}" opacity="${alpha}" class="sg-ring" style="animation-duration: ${(1.6 + i * .4).toFixed(1)}s; animation-delay: ${(i * .2).toFixed(2)}s;"/>`;
      if (r.live) {
        g += `<circle cx="${cx}" cy="${cy}" r="${(ringR - 5).toFixed(0)}" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".5" stroke-dasharray="4 6"/>`;
      }
      // label on ring right edge
      const lx = cx + ringR + 8;
      g += `<text x="${lx.toFixed(0)}" y="${cy.toFixed(0)}" class="sg-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });
    // centre event horizon
    g += `<circle cx="${cx}" cy="${cy}" r="${maxR * .13}" fill="var(--accent)" opacity=".9">
      <animate attributeName="r" values="${(maxR * .11).toFixed(0)};${(maxR * .15).toFixed(0)};${(maxR * .11).toFixed(0)}" dur="2.4s" repeatCount="indefinite"/>
    </circle>`;

    host.innerHTML = `<svg class="sg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "星门", eyebrow: "QUOTA STARGATE", render };
})();
