/* -------------------------------------------------------------- headland
 * Headland — grassy cliff-top promontory over a grey sea: every
 * quota window is a headland whose height = used % (≥85% the
 * summit wears an amber flame); sessions are albatross soaring.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "headland";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232, SY = 246;

    // grey sea
    const sea = `<rect x="0" y="${SY}" width="${W}" height="${H - SY}" fill="color-mix(in srgb, #2a4048 70%, var(--card-2))"/>`;
    // horizon line
    const horizon = `<line x1="0" y1="${SY}" x2="${W}" y2="${SY}" stroke="#4a5a60" stroke-width=".8" opacity=".5"/>`;
    // grass tufts on the promontory top
    let grass = "";
    for (let i = 0; i < 10; i++) {
      const gx = 20 + i * 38;
      const gh = 4 + rnd() * 6;
      grass += `<line x1="${gx}" y1="${GY}" x2="${gx + (rnd() - .5) * 4}" y2="${GY - gh}" stroke="#3a5a3a" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`;
    }
    // whitecaps
    let caps = "";
    for (let i = 0; i < 6; i++) {
      caps += `<ellipse cx="${(30 + rnd() * (W - 60)).toFixed(1)}" cy="${(SY + 6 + rnd() * 30).toFixed(1)}" rx="${(4 + rnd() * 8).toFixed(1)}" ry="${(1.2 + rnd() * 1.5).toFixed(1)}" fill="#e8f0e8" opacity="${(.15 + rnd() * .2).toFixed(2)}"/>`;
    }

    // headlands — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const heads = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a6a4a";
      const hh = 30 + f * 85;
      const hw = 12 + f * 20;
      const tipY = GY - hh;
      // headland body — sloping promontory
      const body = `<path d="M ${cx - hw} ${GY} Q ${cx - hw * .5} ${GY - hh * .5} ${cx} ${tipY} Q ${cx + hw * .4} ${GY - hh * .35} ${cx + hw} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #1a2018)"/>`;
      // grassy crest
      const crest = `<path d="M ${cx - hw * .7} ${GY - hh * .12} Q ${cx - hw * .3} ${tipY - 4} ${cx} ${tipY} Q ${cx + hw * .3} ${GY - hh * .3} ${cx + hw * .6} ${GY - hh * .1}" fill="none" stroke="${hot ? "var(--amber)" : "#5a7a4a"}" stroke-width="2" opacity=".7" stroke-linecap="round"/>`;
      // hot flame
      const flame = hot ? `<path d="M ${cx} ${tipY - 2} Q ${cx - 3} ${tipY - 10} ${cx} ${tipY - 14} Q ${cx + 3} ${tipY - 10} ${cx} ${tipY - 2} Z" fill="var(--amber)" opacity=".8">
        <animate attributeName="opacity" values=".8;.3;.8" dur="1.4s" repeatCount="indefinite"/></path>` : "";
      // strata
      const strata = `<path d="M ${cx - hw * .5} ${GY - hh * .3} L ${cx - hw * .15} ${GY - hh * .55}" stroke="#3a4a38" stroke-width=".6" opacity=".35"/>
        <path d="M ${cx + hw * .45} ${GY - hh * .25} L ${cx + hw * .1} ${GY - hh * .5}" stroke="#3a4a38" stroke-width=".6" opacity=".35"/>`;
      return `<g class="he-hill${hot ? " hot" : ""}">
        ${body}${crest}${strata}${flame}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="he-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="he-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // albatross — sessions soaring
    const albs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 15 - (s.tps || 0) / 12);
      const y = GY - 25 - (i % 3) * 16;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      return `<g class="he-alb${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-26} ${y} Q ${W * .35} ${y - 25} ${W * .65} ${y + 10} T ${W + 26} ${y - 18}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.2}" y1="0" x2="${-size * 2.6}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.2}" y1="0" x2="${size * 2.6}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="he-wrap">
        <div class="he-tor"><b>HEADLAND</b><span>岬头=配额窗 高=用量 信天翁=会话${hotN ? " · " + hotN + " 火焰" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a242a 60%, transparent)" rx="10"/>
          ${sea}${horizon}${caps}${heads}${grass}${albs}
          <g class="he-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="he-k">${fmt(k.tokens)} · ${sessions.length} 信天翁</text>
            <text x="22" y="45" class="he-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "岬头", eyebrow: "HEADLAND", render };
})();
