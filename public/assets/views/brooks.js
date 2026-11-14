/* ------------------------------------------------------------------ brooks
 * Brooks — winding streams through a meadow: every quota
 * window is a stepping stone whose size = used % (≥85% the
 * moss cap glows amber); sessions are dippers walking the
 * stream bed.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brooks";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(10882244);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 250;

    // meadow sky
    const sky = `<defs><linearGradient id="bs-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c0e0c8"/><stop offset="100%" stop-color="#e0f0d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bs-s)" rx="10"/>`;
    // banks
    const bank1 = `<path d="M 0 ${WY + 20} Q 100 ${WY + 5} 200 ${WY + 15} Q 300 ${WY + 25} 400 ${WY + 12} L 400 ${WY - 30} L 0 ${WY - 30} Z" fill="color-mix(in srgb, #68a058 60%, var(--card-2))"/>`;
    const bank2 = `<path d="M 0 ${WY + 60} Q 100 ${WY + 75} 200 ${WY + 65} Q 300 ${WY + 55} 400 ${WY + 70} L 400 ${H} L 0 ${H} Z" fill="color-mix(in srgb, #589048 60%, var(--card-2))"/>`;
    // water — the winding brook
    const water = `<path d="M 0 ${WY + 20} Q 100 ${WY + 5} 200 ${WY + 15} Q 300 ${WY + 25} 400 ${WY + 12} L 400 ${WY + 70} Q 300 ${WY + 55} 200 ${WY + 65} Q 100 ${WY + 75} 0 ${WY + 60} Z" fill="color-mix(in srgb, #58a8c8 60%, var(--card-2))"/>`;
    // current lines
    let currents = "";
    for (let i = 0; i < 6; i++) {
      currents += `<path d="M ${(rnd() * 200).toFixed(1)} ${(WY + 25 + rnd() * 35).toFixed(1)} q 20 ${(rnd() * 4 - 2).toFixed(1)} 40 ${(rnd() * 4 - 2).toFixed(1)}" stroke="#a8d8e8" stroke-width=".8" fill="none" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // meadow grass
    let grass = "";
    for (let i = 0; i < 12; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(WY - 15 + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(WY - 12 + rnd() * 20).toFixed(1)}" stroke="#588848" stroke-width=".7" opacity="${(.25 + rnd() * .15).toFixed(2)}"/>`;
    }

    // stepping stones — size = used %
    const n = Math.max(1, quotas.length);
    const stones = quotas.map((w, i) => {
      const t = (i + .5) / n;
      // stones sit along the meander
      const cx = 30 + t * (W - 60);
      const cy = WY + 20 + Math.sin(t * Math.PI * 2) * 22;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#787878";
      const sr = 8 + f * 20;
      // stone — flattened ellipse
      const stone = `<ellipse cx="${cx}" cy="${cy}" rx="${sr}" ry="${sr * .5}" fill="color-mix(in srgb, ${col} 65%, #686868)"/>`;
      // top face
      const face = `<ellipse cx="${cx}" cy="${cy - sr * .12}" rx="${sr * .9}" ry="${sr * .38}" fill="color-mix(in srgb, ${col} 80%, #888888)"/>`;
      // moss cap — size = used %
      const mossCap = `<ellipse cx="${cx - sr * .15}" cy="${cy - sr * .25}" rx="${sr * .5}" ry="${sr * .15}" fill="${hot ? "var(--amber)" : "#588848"}" opacity="${hot ? ".7" : ".6"}"/>`;
      // hot pulse ring
      const pulse = hot ? `<ellipse cx="${cx}" cy="${cy}" rx="${sr + 4}" ry="${sr * .55}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".4">
        <animate attributeName="rx" values="${sr + 4};${sr + 10}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".4;.05" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      // water ring around stone
      const ring = `<ellipse cx="${cx}" cy="${cy + sr * .4}" rx="${sr * 1.3}" ry="${sr * .15}" fill="none" stroke="#a8d8e8" stroke-width=".7" opacity=".4"/>`;
      return `<g class="bs-stone${hot ? " hot" : ""}">
        ${ring}${stone}${face}${mossCap}${pulse}
        <text x="${cx.toFixed(1)}" y="${cy + sr * .9 + 12}" class="bs-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${cy + sr * .9 + 22}" class="bs-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // dippers — walking the stream bed
    const dippers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = WY + 35 + (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#483828");
      return `<g class="bs-dip${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .55}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .3}" r="${size * .35}" fill="${col}"/>
        <ellipse cx="${size * .2}" cy="${size * .1}" rx="${size * .4}" ry="${size * .3}" fill="#e8e8e0" opacity=".8"/>
        <path d="M ${-size * .7} ${size * .2} L ${-size * 1.2} ${size * .6}" stroke="${col}" stroke-width=".5" fill="none"/>
        <path d="M ${size * .4} ${-size * .4} L ${size * 1.1} ${-size * .8}" stroke="${col}" stroke-width=".4" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bs-wrap">
        <div class="bs-head"><b>BROOKS</b><span>石=配额窗 石径=用量 河乌=会话${hotN ? " · " + hotN + " 燃苔" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${bank1}${water}${currents}${bank2}${grass}${stones}${dippers}
          <g class="bs-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bs-k">${fmt(k.tokens)} · ${sessions.length} 乌</text>
            <text x="22" y="45" class="bs-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "溪流", eyebrow: "BROOKS", render };
})();
