/* ------------------------------------------------------------------- crag
 * Crag — bare granite tor above the treeline: every quota window is
 * a tor whose height = used % (≥85% the summit burns ember);
 * sessions are vultures wheeling on the thermals.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crag";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66778899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;

    // grey sky — heavy, above treeline
    const sky = `<defs><linearGradient id="cg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a3038"/><stop offset="60%" stop-color="#3a4048"/><stop offset="100%" stop-color="#4a4a48"/></linearGradient></defs>`;
    // scudding cloud
    let scud = "";
    for (let i = 0; i < 4; i++) {
      scud += `<ellipse cx="${60 + i * 95 + rnd() * 20}" cy="${30 + i * 14}" rx="${28 + rnd() * 18}" ry="${10 + rnd() * 6}" fill="#5a6068" opacity="${(.18 + rnd() * .18).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 14} 0;0 0" dur="${(5 + i).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }
    // boulder field below
    let boulders = "";
    for (let i = 0; i < 10; i++) {
      boulders += `<polygon points="${(15 + rnd() * (W - 30)).toFixed(1)},${(GY + 10 + rnd() * 40).toFixed(1)} ${(28 + rnd() * (W - 40)).toFixed(1)},${(GY + 18 + rnd() * 40).toFixed(1)} ${(20 + rnd() * (W - 35)).toFixed(1)},${(GY + 25 + rnd() * 40).toFixed(1)}" fill="#4a4640" opacity="${(.2 + rnd() * .3).toFixed(2)}"/>`;
    }

    // tors — tor height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const tors = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a6a68";
      const th = 30 + f * 95;
      const tw = 10 + f * 20;
      const tipY = GY - th;
      // tor body — stacked granite blocks
      const body = `<path d="M ${cx - tw / 2} ${GY} L ${cx - tw * .4} ${tipY} L ${cx + tw * .4} ${tipY} L ${cx + tw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #282420)"/>`;
      // block joints
      const joints = `<line x1="${cx - tw * .35}" y1="${GY - th * .35}" x2="${cx + tw * .35}" y2="${GY - th * .35}" stroke="#3a3630" stroke-width=".8" opacity=".5"/>
        <line x1="${cx - tw * .3}" y1="${GY - th * .65}" x2="${cx + tw * .3}" y2="${GY - th * .65}" stroke="#3a3630" stroke-width=".8" opacity=".5"/>`;
      // summit cap
      const cap = `<rect x="${cx - tw * .35}" y="${tipY - 2}" width="${tw * .7}" height="3" rx="1" fill="${hot ? "color-mix(in srgb, var(--red) 55%, #c8c0b0)" : "#c8c0b0"}" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      // hot ember ring
      const ring = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="none" stroke="var(--red)" stroke-width="1" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="cg-tor${hot ? " hot" : ""}">
        ${body}${joints}${cap}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="cg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="cg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // vultures — sessions wheeling on thermals
    const vultures = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 13);
      const y = GY - 30 - (i % 3) * 18;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#6a5a4a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 50 + rnd() * 70;
      const ry2 = 8 + rnd() * 10;
      return `<g class="cg-vult${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .55}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .4}" ry="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.2}" y1="0" x2="${-size * 2.2}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.2}" y1="0" x2="${size * 2.2}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cg-wrap">
        <div class="cg-head"><b>CRAG</b><span>崖顶=配额窗 高=用量 秃鹫=会话${hotN ? " · " + hotN + " 余烬" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cg-sky)" rx="10"/>
          ${sky}${scud}${boulders}${tors}${vultures}
          <g class="cg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cg-k">${fmt(k.tokens)} · ${sessions.length} 鹫</text>
            <text x="22" y="45" class="cg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "崖顶", eyebrow: "CRAG", render };
})();
