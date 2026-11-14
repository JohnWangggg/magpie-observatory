/* ------------------------------------------------------------------ harbours
 * Harbours — fishing boats moored along a stone quay: every
 * quota window is a boat whose mast height = used % (≥85% the
 * lantern burns amber); sessions are gulls wheeling over the
 * water.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harbours";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22004466);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 210, GY = 250;

    // harbour sky
    const sky = `<defs><linearGradient id="hs-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8d8e0"/><stop offset="100%" stop-color="#e8e0d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hs-s)" rx="10"/>`;
    // water
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #5888a0 60%, var(--card-2))"/>`;
    // wave ripples
    let ripples = "";
    for (let i = 0; i < 7; i++) {
      ripples += `<path d="M ${(rnd() * W).toFixed(1)} ${(WY + 8 + rnd() * 25).toFixed(1)} Q ${(rnd() * W).toFixed(1)} ${(WY + 6 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)} ${(WY + 8 + rnd() * 25).toFixed(1)}" stroke="#a8d0e0" stroke-width=".7" fill="none" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }
    // stone quay
    const quay = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #989088 60%, var(--card-2))"/>`;
    let stones = "";
    for (let i = 0; i < 14; i++) {
      stones += `<rect x="${(rnd() * W).toFixed(1)}" y="${(GY + 4 + rnd() * 35).toFixed(1)}" width="${(6 + rnd() * 10).toFixed(1)}" height="${(4 + rnd() * 5).toFixed(1)}" rx="1" fill="#888078" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }

    // boats — mast height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const boats = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#687888";
      const mh = 20 + f * 70;
      const bw = 14 + f * 22;
      const hullY = WY + 10;
      // hull
      const hull = `<path d="M ${cx - bw / 2} ${hullY} L ${cx - bw * .35} ${hullY + 10} L ${cx + bw * .35} ${hullY + 10} L ${cx + bw / 2} ${hullY} Z" fill="color-mix(in srgb, ${col} 60%, #485868)"/>`;
      // mast
      const mast = `<line x1="${cx}" y1="${hullY}" x2="${cx}" y2="${hullY - mh}" stroke="${col}" stroke-width="1.8" opacity=".8"/>`;
      // sail — furled triangle
      const sail = `<path d="M ${cx} ${hullY - mh} L ${cx + bw * .3} ${hullY - mh * .3} L ${cx} ${hullY - mh * .3} Z" fill="color-mix(in srgb, ${col} 40%, #e8e8e0)" opacity=".8"/>`;
      // pennant
      const penn = `<line x1="${cx}" y1="${hullY - mh}" x2="${cx}" y2="${hullY - mh - 6}" stroke="${col}" stroke-width="1"/><path d="M ${cx} ${hullY - mh - 6} L ${cx + 7} ${hullY - mh - 4} L ${cx} ${hullY - mh - 2} Z" fill="${hot ? "var(--amber)" : "#c05040"}"/>`;
      // lantern at masthead
      const lamp = hot ? `<circle cx="${cx}" cy="${hullY - mh - 8}" r="3" fill="var(--amber)" opacity=".75">
        <animate attributeName="r" values="3;5" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".75;.25" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      // reflection
      const refl = `<path d="M ${cx - bw * .3} ${hullY + 13} L ${cx + bw * .3} ${hullY + 13} L ${cx + bw * .2} ${hullY + 22} L ${cx - bw * .2} ${hullY + 22} Z" fill="${col}" opacity=".12"/>`;
      return `<g class="hs-boat${hot ? " hot" : ""}">
        ${hull}${mast}${sail}${penn}${lamp}${refl}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="hs-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="hs-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // gulls — wheeling over the water
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = 50 + (i % 3) * 16;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8ecf0");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 45 + rnd() * 55;
      const ry2 = 10 + rnd() * 10;
      return `<g class="hs-gull${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .45}" fill="${col}"/>
        <path d="M ${-size * 1.1} 0 L ${-size * 1.8} ${-size * .7} L ${-size * 1.8} ${size * .7} Z" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .15}" r="${size * .25}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hs-wrap">
        <div class="hs-head"><b>HARBOURS</b><span>船=配额窗 桅高=用量 鸥=会话${hotN ? " · " + hotN + " 燃灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${water}${ripples}${quay}${stones}${boats}${gulls}
          <g class="hs-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="hs-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="hs-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "渔港", eyebrow: "HARBOURS", render };
})();
