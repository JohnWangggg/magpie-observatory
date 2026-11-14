/* ------------------------------------------------------------------ point
 * Point — a lighthouse on a rocky tip: every quota window is a
 * beacon whose light-beam length = used % (≥85% the lamp flares
 * amber); sessions are seabirds circling the tower.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "point";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 230, SY = 246;

    // night sea
    const sea = `<rect x="0" y="${SY}" width="${W}" height="${H - SY}" fill="color-mix(in srgb, #12202a 75%, var(--card-2))"/>`;
    // horizon
    const horizon = `<line x1="0" y1="${SY}" x2="${W}" y2="${SY}" stroke="#2a3a44" stroke-width=".8" opacity=".5"/>`;
    // rocky shore at the base
    let rocks = "";
    for (let i = 0; i < 10; i++) {
      rocks += `<polygon points="${(15 + rnd() * (W - 30)).toFixed(1)},${(GY + 5 + rnd() * 40).toFixed(1)} ${(25 + rnd() * (W - 40)).toFixed(1)},${(GY + 12 + rnd() * 40).toFixed(1)} ${(20 + rnd() * (W - 35)).toFixed(1)},${(GY + 18 + rnd() * 40).toFixed(1)}" fill="#2a2420" opacity="${(.25 + rnd() * .3).toFixed(2)}"/>`;
    }
    // faint beam sweep on the sea
    const sweep = `<line x1="0" y1="${SY + 20}" x2="${W}" y2="${SY + 25}" stroke="#3a4a50" stroke-width=".5" opacity=".1">
      <animate attributeName="opacity" values=".1;.2;.1" dur="6s" repeatCount="indefinite"/></line>`;

    // lighthouses — beam length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const lights = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#e8d8b8";
      const th = 40 + f * 70;
      const tw = 8 + f * 12;
      const lampY = GY - th;
      // tower — striped red/white
      const stripes = `<path d="M ${cx - tw / 2} ${GY} L ${cx - tw * .35} ${lampY} L ${cx + tw * .35} ${lampY} L ${cx + tw / 2} ${GY} Z" fill="color-mix(in srgb, #c8b8a8 70%, var(--card-2))"/>`;
      const bands = `<rect x="${cx - tw * .4}" y="${GY - th * .3}" width="${tw * .8}" height="3" fill="#c84030" opacity=".7"/>
        <rect x="${cx - tw * .38}" y="${GY - th * .6}" width="${tw * .76}" height="3" fill="#c84030" opacity=".7"/>`;
      // lamp housing
      const lamp = `<rect x="${cx - tw * .38}" y="${lampY - 8}" width="${tw * .76}" height="8" rx="1.5" fill="${hot ? "var(--amber)" : col}" opacity=".9"/>`;
      // light beam — length = used %
      const bl = 30 + f * 70;
      const beam = `<path d="M ${cx} ${lampY - 4} L ${cx + bl} ${lampY - 12} L ${cx + bl} ${lampY + 4} Z" fill="${hot ? "var(--amber)" : col}" opacity="${(.15 + f * .2).toFixed(2)}">
        <animate attributeName="opacity" values="${(.15 + f * .2).toFixed(2)};${(.05 + f * .1).toFixed(2)};${(.15 + f * .2).toFixed(2)}" dur="4s" repeatCount="indefinite"/></path>`;
      // hot flare
      const flare = hot ? `<circle cx="${cx}" cy="${lampY - 4}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(6 + f * 3).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="pn-light${hot ? " hot" : ""}">
        ${stripes}${bands}${lamp}${beam}${flare}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="pn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="pn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // seabirds — sessions circling the tower
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const y = GY - 30 - (i % 3) * 16;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      const cx2 = W / 2 + (rnd() - .5) * 60;
      const cy2 = y;
      const rx2 = 40 + rnd() * 60;
      const ry2 = 8 + rnd() * 10;
      return `<g class="pn-bird${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.1}" y1="0" x2="${-size * 1.9}" y2="${-size * .8}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * 1.1}" y1="0" x2="${size * 1.9}" y2="${-size * .8}" stroke="${col}" stroke-width=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pn-wrap">
        <div class="pn-head"><b>POINT</b><span>灯塔=配额窗 光程=用量 海鸟=会话${hotN ? " · " + hotN + " 燃灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #121a20 65%, transparent)" rx="10"/>
          ${sea}${horizon}${rocks}${sweep}${lights}${birds}
          <g class="pn-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pn-k">${fmt(k.tokens)} · ${sessions.length} 海鸟</text>
            <text x="22" y="45" class="pn-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海角尖", eyebrow: "POINT", render };
})();
