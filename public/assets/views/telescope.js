/* ------------------------------------------------------------------ telescope
 * Telescope — a dome slit on a hill: every quota window is a
 * star target (declination + magnitude = used%, ≥85% the
 * reticle burns amber); sessions are astronomers (a hood +
 * eyepiece) tracking the drift.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "telescope";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = W / 2, CY = H / 2 + 10;
    // dome
    const dome = `<path d="M${CX - 90} ${CY + 60} A 90 70 0 0 1 ${CX + 90} ${CY + 60}" fill="#1c2030" stroke="#384058" stroke-width="1.5"/>
      <rect x="${CX - 8}" y="${CY - 90}" width="16" height="150" fill="#141a28" opacity=".7"/>`;
    // hill
    const hill = `<path d="M0 ${H} L${W} ${H} L${W} ${CY + 60} Q ${W * .7} ${CY + 80} ${CX} ${CY + 78} Q ${W * .3} ${CY + 80} 0 ${CY + 60} Z" fill="#1a2420"/>`;

    const targets = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0c0f0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      // scatter targets in dome field
      const ang = (i * 137.5 + 40) * Math.PI / 180;
      const dist = 40 + (i % 4) * 18;
      const x = CX + Math.cos(ang) * dist;
      const y = CY - 20 + Math.sin(ang) * dist * .6;
      const mag = 2 + f * 4;
      // reticle crosshair when hot
      const ret = hot ? `<circle cx="${x}" cy="${y}" r="${mag + 5}" fill="none" stroke="var(--amber)" stroke-width=".8">
          <animate attributeName="r" values="${mag + 5};${mag + 8};${mag + 5}" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="tl-target${hot ? " hot" : ""}">
        ${ret}
        <circle cx="${x}" cy="${y}" r="${mag}" fill="${col}"/>
        <line x1="${x - mag - 3}" y1="${y}" x2="${x - mag - 1}" y2="${y}" stroke="${col}" stroke-width=".6"/>
        <line x1="${x + mag + 1}" y1="${y}" x2="${x + mag + 3}" y2="${y}" stroke="${col}" stroke-width=".6"/>
        <text x="${x + mag + 6}" y="${y + 3}" class="tl-name">${esc(w.name.slice(0, 4))}</text>
      </g>`;
    }).join("");

    // astronomers — hood + eyepiece
    const astronomers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#80a0d0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = CY + 55 - (i % 2) * 4;
      return `<g class="tl-astro${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3.5" fill="${col}"/>
        <rect x="-5" y="-4" width="10" height="9" rx="2" fill="${col}" opacity=".85"/>
        <line x1="4" y1="-6" x2="10" y2="-12" stroke="${col}" stroke-width="2"/>
        <circle cx="10" cy="-12" r="2" fill="#384058"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tl-wrap">
        <div class="tl-head"><b>TELESCOPE</b><span>星标=配额窗 星等=用量 十字丝=过热 观星者=会话${hotN ? " · " + hotN + " 锁" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0a0e18" rx="10"/>
          <!-- star field -->
          ${Array.from({length: 24}, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 61) % 200}" r="${(i % 3) * .8 + .5}" fill="#8a94a8" opacity="${(i % 4) * .15 + .2}"/>`).join("")}
          ${hill}${dome}${targets}${astronomers}
          <text x="16" y="${H - 18}" class="tl-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="tl-ksub" text-anchor="end">穹缝=开口</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "观星台", eyebrow: "TELESCOPE", render };
})();
