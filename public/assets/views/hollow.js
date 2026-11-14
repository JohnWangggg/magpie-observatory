/* ------------------------------------------------------------------ hollow
 * Hollow — a grassy depression at dusk: every quota window is a
 * hollow whose depth = used % (≥85% the pit glows amber);
 * sessions are fireflies drifting through the air.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hollow";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 180;

    // dusk sky
    const sky = `<defs><linearGradient id="hl-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a2030"/><stop offset="100%" stop-color="#252030"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hl-s)" rx="10"/>`;
    // stars
    let stars = "";
    for (let i = 0; i < 20; i++) {
      stars += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(15 + rnd() * 60).toFixed(1)}" r="${(rnd() * .8 + .3).toFixed(1)}" fill="#e8d8a8" opacity="${(.1 + rnd() * .2).toFixed(2)}"/>`;
    }
    // grass ridge
    const ridge = `<path d="M 0 ${GY} L 0 ${GY - 15} L 60 ${GY - 8} L 120 ${GY - 20} L 180 ${GY - 10} L 240 ${GY - 25} L 300 ${GY - 12} L 360 ${GY - 20} L 400 ${GY - 15} L 400 ${GY} Z" fill="color-mix(in srgb, #2a3820 80%, var(--card-2))"/>`;

    // hollows — depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const hollows = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a7a3a";
      const hd = 15 + f * 50;
      const hw = 12 + f * 18;
      const pitY = GY + hd;
      // pit walls
      const wall = `<path d="M ${cx - hw / 2} ${GY} Q ${cx - hw * .3} ${GY + hd * .4} ${cx} ${pitY} Q ${cx + hw * .3} ${GY + hd * .4} ${cx + hw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 45%, #1a2015)"/>`;
      // grass lip
      const lip = `<ellipse cx="${cx}" cy="${GY}" rx="${hw * .6}" ry="5" fill="color-mix(in srgb, ${col} 55%, #3a4a2a)"/>`;
      // amber glow at bottom
      const glow = hot ? `<ellipse cx="${cx}" cy="${pitY}" rx="${hw * .4}" ry="6" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${hw * .4};${hw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="6;10" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ho-pit${hot ? " hot" : ""}">
        ${wall}${lip}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="ho-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="ho-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fireflies — sessions drifting
    const fireflies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 12);
      const y = GY - 15 - (i % 3) * 18;
      const size = 2 + Math.min(1.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8d888");
      const cx2 = W / 2 + (rnd() - .5) * 100;
      const cy2 = y;
      const rx2 = 60 + rnd() * 80;
      const ry2 = 8 + rnd() * 10;
      return `<g class="ho-fly${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <circle cx="0" cy="0" r="${size}" fill="${col}" opacity=".9">
          <animate attributeName="opacity" values=".9;.2" dur="${(1 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="${size};${size * 1.4}" dur="${(1 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/></circle>
        <circle cx="0" cy="0" r="${size * .4}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ho-wrap">
        <div class="ho-head"><b>HOLLOW</b><span>洼坑=配额窗 深=用量 萤火虫=会话${hotN ? " · " + hotN + " 暖坑" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${stars}${ridge}${hollows}${fireflies}
          <g class="ho-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ho-k">${fmt(k.tokens)} · ${sessions.length} 萤</text>
            <text x="22" y="45" class="ho-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "洼地", eyebrow: "HOLLOW", render };
})();
