/* -------------------------------------------------------------------- oasis
 * Oasis — desert springs ringed by palms: every quota window is a
 * spring pool whose fountain jet rises higher as used % climbs
 * (≥85% the jet boils over amber); sessions are camels drinking
 * at the pools.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oasis";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 228;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // springs — fountain jet height = used %
    const springs = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4aa8b8";
      const poolR = gap * .28;
      const jetH = 16 + f * 80;
      // palm pair flanking each pool
      const palm = (dx, flip) => `
        <line x1="${cx + dx}" y1="${GY}" x2="${cx + dx + flip * 4}" y2="${GY - 26}" stroke="#7a5a3a" stroke-width="2"/>
        <path d="M ${cx + dx + flip * 4} ${GY - 26} q ${flip * 12} -6 ${flip * 18} 0 M ${cx + dx + flip * 4} ${GY - 26} q ${flip * -10} -8 ${flip * -16} -2 M ${cx + dx + flip * 4} ${GY - 26} q ${flip * 4} -12 ${flip * 10} -14 M ${cx + dx + flip * 4} ${GY - 26} q ${flip * -2} -11 ${flip * -8} -13"
          stroke="#4a8a4a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
      // fountain jet
      const jet = `<path d="M ${cx - 3} ${GY - 6} Q ${cx} ${GY - 6 - jetH} ${cx + 3} ${GY - 6}" fill="none" stroke="${hot ? "var(--amber)" : "#7ac9d9"}" stroke-width="2" opacity=".85" stroke-linecap="round">
        <animate attributeName="d" values="M ${cx - 3} ${GY - 6} Q ${cx} ${GY - 6 - jetH} ${cx + 3} ${GY - 6};M ${cx - 3} ${GY - 6} Q ${cx} ${GY - 6 - jetH * .82} ${cx + 3} ${GY - 6};M ${cx - 3} ${GY - 6} Q ${cx} ${GY - 6 - jetH} ${cx + 3} ${GY - 6}" dur="${(1.4 - f * .4).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // spray droplets
      const spray = Array.from({ length: 3 }, (_, k) =>
        `<circle cx="${(cx + (k - 1) * 6).toFixed(1)}" cy="${(GY - 8 - jetH * .8).toFixed(1)}" r="1.4" fill="${hot ? "var(--amber)" : "#9adfe8"}">
          <animate attributeName="cy" values="${(GY - 8 - jetH * .8).toFixed(1)};${(GY - 4).toFixed(1)}" dur="${(0.9 + k * .15).toFixed(1)}s" begin="${(-k * .3).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(0.9 + k * .15).toFixed(1)}s" begin="${(-k * .3).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("");
      // pool
      const pool = `<ellipse cx="${cx}" cy="${GY}" rx="${poolR.toFixed(1)}" ry="${(poolR * .4).toFixed(1)}" fill="color-mix(in srgb, ${col} ${35 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--amber)" : col}" stroke-width="1.2"/>`;
      return `<g class="oa-spring${hot ? " hot" : ""}">
        ${pool}${jet}${spray}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="oa-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="oa-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // palm fringes at scene edges
    const edgePalms = `<g opacity=".7">
      <path d="M 22 ${GY} q 0 -10 -5 -14 M 22 ${GY} q 0 -11 6 -13 M 22 ${GY} q -3 -8 -9 -9 M 22 ${GY} q 3 -8 9 -7" stroke="#4a8a4a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M 378 ${GY} q 0 -10 -5 -14 M 378 ${GY} q 0 -11 6 -13 M 378 ${GY} q -3 -8 -9 -9 M 378 ${GY} q 3 -8 9 -7" stroke="#4a8a4a" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;

    // camels — sessions drinking / passing
    const camels = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(10, 20 - (s.tps || 0) / 8);
      const y = GY - 14 - (i % 3) * 16;
      const size = 4 + Math.min(4, (s.tokens || 0) / 50000);
      return `<g class="oa-camel${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y.toFixed(1)};${W + 26} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size * 1.8} 0 Q ${-size * .9} ${-size * 1.1} ${-size * .3} ${-size * .5} Q ${size * .3} ${-size * 1.4} ${size * .9} ${-size * .6} Q ${size * 1.5} ${-size * .3} ${size * 1.8} 0 Z"
          fill="${dead ? "var(--red)" : m.color || "#c98a4a"}"/>
        <path d="M ${size * 1.4} ${-size * .6} Q ${size * 2} ${-size * 1.6} ${size * 2.3} ${-size * 1.8} L ${size * 2.5} ${-size * 1.5} L ${size * 1.9} ${-size * .3} Z"
          fill="${dead ? "var(--red)" : m.color || "#c98a4a"}"/>
        <circle cx="${size * 2.4}" cy="${-size * 1.7}" r="${size * .4}" fill="${dead ? "var(--red)" : m.color || "#c98a4a"}"/>
        <line x1="${-size * 1.2}" y1="0" x2="${-size * 1.2}" y2="${size * 1.8}" stroke="#8a5a2a" stroke-width="1.4"/>
        <line x1="${size * 1}" y1="0" x2="${size * 1}" y2="${size * 1.8}" stroke="#8a5a2a" stroke-width="1.4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="oa-wrap">
        <div class="oa-head"><b>OASIS</b><span>泉=配额窗 涌=用量 驼=会话${hotN ? " · " + hotN + " 泉沸" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #241c10 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c9a86a" opacity=".5"/>
          ${edgePalms}${springs}${camels}
          <g class="oa-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="oa-k">${fmt(k.tokens)} · ${sessions.length} 驼</text>
            <text x="22" y="45" class="oa-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绿洲", eyebrow: "OASIS", render };
})();
