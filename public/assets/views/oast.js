/* -------------------------------------------------------------------- oast
 * Oast view — a row of hop-kiln cones, one per quota window. Cone
 * height tracks tokens burned; the rotating cowl spins for live
 * sessions; a smoke ring puffs off on errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oast";
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
    if (!top.length) { host.innerHTML = `<div class="oa-empty">暂无麦窑</div>`; return; }

    const groundY = H * 0.86;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const coneH = 40 + (r.used / 100) * (groundY - 90);
      const baseY = groundY;
      const apexY = baseY - coneH;
      const baseR = 16 + (r.used / 100) * 12;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // kiln body — tapered cone
      g += `<path d="M ${x - baseR} ${baseY} L ${x - baseR * .55} ${apexY} L ${x + baseR * .55} ${apexY} L ${x + baseR} ${baseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // cowl — rotating vane on top
      const cowlR = 7;
      g += `<g class="oa-cowl" style="transform-origin: ${x}px ${apexY - 2}px; animation-duration: ${Math.max(2, 6 - r.used * .05).toFixed(1)}s">
        <ellipse cx="${x}" cy="${apexY - 2}" rx="${cowlR}" ry="3" fill="none" stroke="${r.col}" stroke-width="1.4"/>
        <path d="M ${x} ${apexY - 2} L ${x + cowlR} ${apexY - 6} L ${x + cowlR * .4} ${apexY - 8} Z" fill="${r.col}"/>
      </g>`;
      // smoke puffs for live sessions
      for (let s = 0; s < Math.min(2, r.live); s++) {
        const sy = apexY - 14 - s * 10;
        g += `<ellipse cx="${x + s * 4}" cy="${sy.toFixed(0)}" rx="${3 + s * 2}" ry="${2 + s}" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".5">
          <animate attributeName="ry" values="${2 + s};${5 + s}" dur="${1.2 + s * .3}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".5;0" dur="${1.2 + s * .3}s" repeatCount="indefinite"/>
        </ellipse>`;
      }
      // error — red smoke ring
      if (r.err) {
        g += `<ellipse cx="${x}" cy="${apexY - 18}" rx="6" ry="3" fill="none" stroke="var(--red)" stroke-width="1.4" opacity=".9">
          <animate attributeName="ry" values="3;8" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="1s" repeatCount="indefinite"/>
        </ellipse>`;
      }
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="oa-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="oa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "烘麦窑", eyebrow: "QUOTA OAST", render };
})();
