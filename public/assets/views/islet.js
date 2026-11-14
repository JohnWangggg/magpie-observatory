/* -------------------------------------------------------------------- islet
 * Islet — palm atolls in turquoise shallows: every quota window is
 * a palm whose crown spread = used % (≥85% the crown burns coral-
 * orange); sessions are crabs scuttling the sandbank.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "islet";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66778899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 228;

    // turquoise shallows — sand ripples + light caustics
    const sea = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #2a6a70 60%, var(--card-2))"/>`;
    let caust = "";
    for (let i = 0; i < 10; i++) {
      const cx = 30 + i * 40 + rnd() * 14;
      caust += `<ellipse cx="${cx.toFixed(1)}" cy="${(GY + 10 + rnd() * 50).toFixed(1)}" rx="${(6 + rnd() * 10).toFixed(1)}" ry="${(1.5 + rnd() * 2).toFixed(1)}" fill="#b8f0e0" opacity="${(.1 + rnd() * .15).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 10} 0;0 0" dur="${(4 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }
    // sandbank arc
    const bank = `<path d="M 60 ${GY + 20} Q 200 ${GY - 8} 340 ${GY + 20} Q 340 ${GY + 40} 200 ${GY + 46} Q 60 ${GY + 40} 60 ${GY + 20} Z" fill="#d8c8a0" opacity=".8"/>
      <path d="M 70 ${GY + 22} Q 200 ${GY + 2} 330 ${GY + 22}" stroke="#e8d8b0" stroke-width="2" fill="none" opacity=".5"/>`;

    // palms — crown spread = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const palms = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a8a5a";
      const ph = 30 + f * 90;
      const pw = 14 + f * 26;
      const tipY = GY - ph;
      // trunk — curved palm
      const lean = (rnd() - .5) * 20;
      const trunk = `<path d="M ${cx - 3} ${GY} Q ${cx - 2 + lean * .4} ${GY - ph * .6} ${cx + lean} ${tipY + 4}" stroke="#8a6a4a" stroke-width="${(2.5 + f * 1.5).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // crown — fan of fronds
      const fronds = Math.round(5 + f * 6);
      let crown = "";
      for (let b = 0; b < fronds; b++) {
        const ang = -170 + (b / Math.max(1, fronds - 1)) * 160;
        const rad = ang * Math.PI / 180;
        const len = pw * (.5 + rnd() * .5);
        const ex = (cx + lean) + Math.cos(rad) * len;
        const ey = tipY + Math.sin(rad) * len * .4;
        crown += `<path d="M ${cx + lean} ${tipY} Q ${((cx + lean + ex) / 2 + (rnd() - .5) * 8).toFixed(1)} ${((tipY + ey) / 2 - 4).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${hot ? "color-mix(in srgb, var(--amber) 55%, " + col + ")" : col}" stroke-width="${(1.5 + f).toFixed(1)}" fill="none" opacity="${(.6 + f * .3).toFixed(2)}" stroke-linecap="round"/>`;
      }
      // coconuts
      const nuts = Math.round(1 + f * 2);
      for (let c = 0; c < nuts; c++) {
        crown += `<circle cx="${(cx + lean - 6 + c * 8).toFixed(1)}" cy="${(tipY + 6 + rnd() * 4).toFixed(1)}" r="${(2 + rnd()).toFixed(1)}" fill="#6a4a2a"/>`;
      }
      return `<g class="il-palm${hot ? " hot" : ""}">
        ${trunk}${crown}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="il-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="il-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // crabs — sessions scuttling the sandbank
    const crabs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 12);
      const y = GY + 30 + (i % 2) * 8;
      const size = 3.5 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#d86a4a");
      // sideways scuttle
      return `<g class="il-crab${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22} ${y};${W + 22} ${y}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .9}" fill="${col}"/>
        <circle cx="${size * .8}" cy="${-size * .8}" r="${size * .3}" fill="${col}"/>
        <circle cx="${-size * .8}" cy="${-size * .8}" r="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.2}" y1="0" x2="${-size * 2.4}" y2="${-size * .8}" stroke="${col}" stroke-width="1.2"/>
        <line x1="${size * 1.2}" y1="0" x2="${size * 2.4}" y2="${-size * .8}" stroke="${col}" stroke-width="1.2"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * 1.8}" y2="${size * 1.6}" stroke="${col}" stroke-width="1"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * 1.8}" y2="${size * 1.6}" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="il-wrap">
        <div class="il-head"><b>ISLET</b><span>椰=配额窗 冠=用量 蟹=会话${hotN ? " · " + hotN + " 珊瑚橙" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #122028 54%, transparent)" rx="10"/>
          ${sea}${caust}${bank}${palms}${crabs}
          <g class="il-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="il-k">${fmt(k.tokens)} · ${sessions.length} 蟹</text>
            <text x="22" y="45" class="il-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "小岛", eyebrow: "ISLET", render };
})();
