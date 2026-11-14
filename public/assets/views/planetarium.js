/* --------------------------------------------------------------- planetarium
 * Planetarium — a dark dome with a star projector at centre:
 * quota windows are orbits around the projector (dot size/glow
 * = used%, ≥85% the planet flares amber); sessions are comets
 * sweeping the dome; constellation lines link the agents.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "planetarium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(31415926);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 7);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, cx = W / 2, cy = H / 2 + 8, TOP = 30, BOT = 36;
    const domeR = Math.min(W, H - TOP - BOT) / 2 - 14;

    // background stars
    const stars = Array.from({ length: 30 }, () => {
      const x = 20 + rnd() * (W - 40), y = 20 + rnd() * (H - TOP - BOT - 10);
      const r = 0.8 + rnd() * 1.6;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#f0f0e0" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
    }).join("");

    // orbits + planets
    const orbits = quotas.map((w, i) => {
      const r = 22 + (i / Math.max(1, quotas.length - 1)) * (domeR - 22);
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0c0f0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const a = (i * 137.5 + 30) * Math.PI / 180; // golden-angle-ish spread
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 0.62; // squash to ellipse
      const pr = 3 + f * 6;
      const dur = Math.max(8, 24 - f * 12);
      return `<g class="pa-orbit${hot ? " hot" : ""}">
        <ellipse cx="${cx}" cy="${cy}" rx="${r.toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" fill="none" stroke="var(--line-2)" stroke-width="0.8" opacity=".4"/>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${col}">
          ${hot ? `<animate attributeName="r" values="${pr.toFixed(1)};${(pr + 2).toFixed(1)};${pr.toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>` : ""}
        </circle>
        ${hot ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(pr + 4).toFixed(1)}" fill="var(--amber)" opacity=".3">
          <animate attributeName="r" values="${(pr + 4).toFixed(1)};${(pr + 7).toFixed(1)};${(pr + 4).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${px.toFixed(1)}" y="${(py + pr + 10).toFixed(1)}" class="pa-num" text-anchor="middle">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // projector
    const projector = `<g class="pa-proj">
      <path d="M${cx - 8} ${cy + 22} L${cx + 8} ${cy + 22} L${cx + 4} ${cy + 8} L${cx - 4} ${cy + 8} Z" fill="#2a3038"/>
      <circle cx="${cx}" cy="${cy + 8}" r="6" fill="#384048"/>
      <circle cx="${cx}" cy="${cy + 8}" r="3" fill="#f0e0a0">
        <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite"/>
      </circle>
    </g>`;

    // comets — sessions sweeping the dome
    const comets = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0f0e0");
      const dur = Math.max(7, 16 - (s.tps || 0) / 12);
      const startA = (i * 90) * Math.PI / 180;
      const endA = startA + Math.PI * 1.3;
      const sx = cx + Math.cos(startA) * domeR;
      const sy = cy + Math.sin(startA) * domeR * 0.62;
      const ex = cx + Math.cos(endA) * domeR;
      const ey = cy + Math.sin(endA) * domeR * 0.62;
      return `<g class="pa-comet">
        <animateMotion path="M${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx} ${cy - domeR * .4} ${ex.toFixed(1)} ${ey.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle r="3" fill="${col}"/>
        <path d="M0 0 L-12 -3" stroke="${col}" stroke-width="1.2" opacity=".6"/>
        <path d="M0 0 L-14 2" stroke="${col}" stroke-width=".8" opacity=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pa-wrap">
        <div class="pa-head"><b>PLANETARIUM</b><span>轨道=配额窗 行星=用量 彗星=会话${hotN ? " · " + hotN + " 耀斑" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0a0d14" rx="10"/>
          ${stars}${orbits}${projector}${comets}
          <text x="16" y="${H - 18}" class="pa-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="pa-ksub" text-anchor="end">中央=星仪</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "天象馆", eyebrow: "PLANETARIUM", render };
})();
