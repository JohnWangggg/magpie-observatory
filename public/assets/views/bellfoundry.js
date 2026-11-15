/* ------------------------------------------------------------ bellfoundry
 * Bellfoundry view — a bronze-casting furnace per quota window. The
 * crucible fill level is burn%, molten metal sloshes, and sparks fly
 * off the rim while the provider has errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bellfoundry";
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
    if (!top.length) { host.innerHTML = `<div class="bf-empty">暂无熔炉</div>`; return; }

    let g = "";
    const pad = 30, colW = (W - pad * (top.length + 1)) / top.length;
    const floor = H * 0.8;

    top.forEach((r, i) => {
      const x = pad + i * (colW + pad), y = floor - 78;
      const w = colW, fh = 78;
      const fillH = fh * (r.used / 100) * .86; // crucible height
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // furnace body — brick silhouette
      g += `<path d="M ${x + w * .15} ${y} L ${x + w * .85} ${y} L ${x + w * .95} ${y + fh} L ${x + w * .05} ${y + fh} Z" fill="var(--card-2)" stroke="${tint}" stroke-width="1.8"/>`;
      // molten metal level inside
      if (r.used > 4) {
        const fy = y + fh - 4 - fillH;
        g += `<rect x="${(x + w * .15 + 3).toFixed(0)}" y="${fy.toFixed(0)}" width="${(w * .7 - 6).toFixed(0)}" height="${fillH.toFixed(0)}" fill="${tint}" opacity=".75"/>`;
        // sloshing top line
        g += `<line x1="${(x + w * .15 + 3).toFixed(0)}" y1="${fy.toFixed(0)}" x2="${(x + w * .85 - 3).toFixed(0)}" y2="${fy.toFixed(0)}" stroke="${tint}" stroke-width="1.6"/>`;
      }
      // chimney
      g += `<rect x="${(x + w * .42).toFixed(0)}" y="${y - 22}" width="${(w * .16).toFixed(0)}" height="22" fill="var(--card-2)" stroke="${tint}" stroke-width="1.4"/>`;
      // sparks fly when err
      if (r.err) {
        for (let s = 0; s < 4; s++) {
          const sx = x + w * .5 + (s % 2 ? 8 : -8) + (s * 3);
          const sy = y - 26 - (s * 9);
          g += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${1.6 - s * .3}" fill="var(--red)" opacity=".9">
            <animate attributeName="cy" values="${sy.toFixed(0)};${(sy - 18).toFixed(0)}" dur="${1.2 + s * .2}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".9;0" dur="${1.2 + s * .2}s" repeatCount="indefinite"/>
          </circle>`;
        }
      }
      // bell hanging in front — swings if live
      if (r.live) {
        g += `<g class="bf-bell" style="transform-origin: ${x + w / 2}px ${y + 14}px; animation-duration: ${(0.6 + r.live * .4).toFixed(2)}s;">
          <line x1="${x + w / 2}" y1="${y + 6}" x2="${x + w / 2}" y2="${y + 26}" stroke="var(--faint)" stroke-width="1.2"/>
          <path d="M ${x + w / 2 - 8} ${y + 26} Q ${x + w / 2 - 9} ${y + 34} ${x + w / 2} ${y + 35} Q ${x + w / 2 + 9} ${y + 34} ${x + w / 2 + 8} ${y + 26} Z" fill="${r.col}"/>
          <circle cx="${x + w / 2}" cy="${y + 36}" r="2.4" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x + w / 2}" y="${floor + 18}" text-anchor="middle" class="bf-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铸钟坊", eyebrow: "BELL FOUNDRY", render };
})();
