/* -------------------------------------------------------------------- bayou
 * Bayou — blackwater under cypress knees and Spanish moss: every
 * quota window is a cypress whose moss curtain thickness = used %
 * (≥85% the moss turns rust-orange); sessions are fireflies rising
 * off the water.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bayou";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55577799);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 218;

    // blackwater with moon reflection
    const water = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #0a1410 72%, var(--card-2))"/>
      <path d="M 0 ${GY} Q 100 ${GY - 2} 200 ${GY} T 400 ${GY}" stroke="#3a6a5a" stroke-width=".8" fill="none" opacity=".35"/>`;
    let ripples = "";
    for (let i = 0; i < 6; i++) {
      const rx = 40 + i * 64 + rnd() * 16;
      ripples += `<ellipse cx="${rx.toFixed(1)}" cy="${(GY + 14 + rnd() * 50).toFixed(1)}" rx="${(10 + rnd() * 14).toFixed(1)}" ry="${(1 + rnd()).toFixed(1)}" fill="none" stroke="#4a8a7a" stroke-width=".6" opacity="${(.2 + rnd() * .2).toFixed(2)}">
        <animate attributeName="rx" values="${(10).toFixed(1)};${(24 + rnd() * 16).toFixed(1)}" dur="${(4 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.05;.3" dur="${(4 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }

    // mist
    let mist = "";
    for (let i = 0; i < 3; i++) {
      mist += `<ellipse cx="${(80 + i * 120).toFixed(1)}" cy="${(GY - 14 - i * 8).toFixed(1)}" rx="${(40 + i * 14).toFixed(1)}" ry="${(5 + i).toFixed(1)}" fill="#c8d8d0" opacity="${(.06 + i * .03).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(i % 2 ? -10 : 10)} 0;0 0" dur="${(7 + i * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }

    // cypresses — trunk + moss curtain thickness = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const trees = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a6a4a";
      const th = 90 + f * 60;
      const tw = 6 + f * 5;
      // trunk
      const trunk = `<path d="M ${cx - tw} ${GY} L ${cx - tw * .5} ${GY - th * .6} L ${cx + tw * .5} ${GY - th * .6} L ${cx + tw} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #3a2a1a)"/>`;
      // knees — cypress knees at base
      const knee = `<ellipse cx="${cx - tw * .8}" cy="${GY + 4}" rx="${tw * .4}" ry="6" fill="color-mix(in srgb, ${col} 40%, #2a1a10)"/>
        <ellipse cx="${cx + tw * .8}" cy="${GY + 4}" rx="${tw * .4}" ry="5" fill="color-mix(in srgb, ${col} 40%, #2a1a10)"/>`;
      // canopy
      const canopy = `<ellipse cx="${cx}" cy="${GY - th}" rx="${(20 + f * 18).toFixed(1)}" ry="${(12 + f * 8).toFixed(1)}" fill="${hot ? "color-mix(in srgb, var(--amber) 35%, " + col + ")" : col}" opacity=".7"/>`;
      // moss curtains — thickness = used %
      const strands = Math.round(2 + f * 8);
      let moss = "";
      for (let s = 0; s < strands; s++) {
        const mx = cx - 16 + s * (32 / Math.max(1, strands - 1));
        const ml = 20 + f * 60 + rnd() * 20;
        const mw = 1 + f * 2.5;
        moss += `<path d="M ${mx.toFixed(1)} ${(GY - th + 6).toFixed(1)} Q ${(mx + (rnd() - .5) * 4).toFixed(1)} ${(GY - th + ml * .6).toFixed(1)} ${(mx + (rnd() - .5) * 8).toFixed(1)} ${(GY - th + ml).toFixed(1)}" stroke="${hot ? "var(--amber)" : "#7a9a6a"}" stroke-width="${mw.toFixed(1)}" fill="none" opacity="${(.5 + f * .35).toFixed(2)}" stroke-linecap="round"/>`;
      }
      return `<g class="by-tree${hot ? " hot" : ""}">
        ${knee}${trunk}${moss}${canopy}
        <text x="${cx.toFixed(1)}" y="${GY + 26}" class="by-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 37}" class="by-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fireflies — sessions rising off the water
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const fx = 50 + i * 60 + rnd() * 20;
      const fy = GY - 20 - rnd() * 80;
      const size = 2 + Math.min(2.5, (s.tokens || 0) / 80000);
      const dur = Math.max(3, 8 - (s.tps || 0) / 20);
      const col = dead ? "var(--red)" : (m.color || "#f0d870");
      return `<g class="by-fly${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${fx.toFixed(1)} ${fy.toFixed(1)};${(fx + 14).toFixed(1)} ${(fy - 20).toFixed(1)};${(fx - 8).toFixed(1)} ${(fy - 36).toFixed(1)};${fx.toFixed(1)} ${fy.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="0" r="${size.toFixed(1)}" fill="${col}">
          <animate attributeName="opacity" values=".9;.3;.9" dur="${(1 + rnd()).toFixed(1)}s" repeatCount="indefinite"/></circle>
        <circle cx="0" cy="0" r="${(size * 2.2).toFixed(1)}" fill="${col}" opacity=".12">
          <animate attributeName="opacity" values=".12;.04;.12" dur="${(1 + rnd()).toFixed(1)}s" repeatCount="indefinite"/></circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="by-wrap">
        <div class="by-head"><b>BAYOU</b><span>柏=配额窗 苔=用量 萤=会话${hotN ? " · " + hotN + " 锈苔" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0a0f0c 62%, transparent)" rx="10"/>
          ${water}${ripples}${mist}${trees}${flies}
          <g class="by-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="by-k">${fmt(k.tokens)} · ${sessions.length} 萤</text>
            <text x="22" y="45" class="by-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沼泽", eyebrow: "BAYOU", render };
})();
