/* ----------------------------------------------------------------- drydock
 * Drydock view — a row of graving docks, one per provider. Hull
 * propped on keel blocks = quota window; stage planks = live
 * sessions; a burst seam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "drydock";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

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
    if (!top.length) { host.innerHTML = `<div class="dd-empty">暂无船坞</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // dock floor
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 28) g += `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const dockW = seg * .78;
      const dockH = 50;
      const dockY = groundY - dockH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // dock walls
      g += `<rect x="${x - dockW / 2}" y="${dockY}" width="10" height="${dockH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + dockW / 2 - 10}" y="${dockY}" width="10" height="${dockH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // keel blocks
      for (let k = 0; k < 4; k++) {
        const kx = x - dockW * .25 + (k / 3) * dockW * .5;
        g += `<rect x="${kx.toFixed(0)}" y="${groundY - 8}" width="8" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      }
      // hull on blocks — waterline painted with remaining quota
      const hullH = dockH * .5;
      const hullY = groundY - 8 - hullH;
      const waterW = hullH * (r.left / 100);
      g += `<path d="M ${x - dockW * .38} ${hullY} L ${x + dockW * .38} ${hullY} L ${x + dockW * .3} ${hullY + hullH * .6} Q ${x} ${hullY + hullH * .8} ${x - dockW * .3} ${hullY + hullH * .6} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // painted waterline
      g += `<rect x="${x - dockW * .38 + 2}" y="${(hullY + hullH - waterW * .6).toFixed(0)}" width="${dockW * .76 - 4}" height="${(waterW * .6).toFixed(0)}" fill="${tint}" opacity=".4"/>`;
      // stage planks for live sessions
      if (r.live) {
        g += `<g class="dd-stage" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - dockW / 2 + 8}" y="${hullY + hullH * .3}" width="${dockW - 16}" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>
          <line x1="${x - dockW / 2 + 12}" y1="${hullY + hullH * .3 + 4}" x2="${x - dockW / 2 + 12}" y2="${groundY - 8}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>
          <line x1="${x + dockW / 2 - 12}" y1="${hullY + hullH * .3 + 4}" x2="${x + dockW / 2 - 12}" y2="${groundY - 8}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>
        </g>`;
      }
      // burst seam on errors
      if (r.err) g += `<path d="M ${x - dockW * .2} ${hullY + hullH * .4} L ${x + dockW * .1} ${hullY + hullH * .55} L ${x - dockW * .05} ${hullY + hullH * .7}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="dd-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "干船坞", eyebrow: "QUOTA DRYDOCK", render };
})();

