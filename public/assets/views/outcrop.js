/* ---------------------------------------------------------------- outcrop
 * Outcrop — exposed bedrock pillars in hard sun: every quota window
 * is a stone column whose height = used % (≥85% the cap glows
 * ember-red); sessions are lizards basking on the flat tops.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "outcrop";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // hard sun disc + heat haze bands
    const sun = `<circle cx="${W - 60}" cy="50" r="30" fill="color-mix(in srgb, var(--amber) 25%, #c8a060)" opacity=".5"/>`;
    let haze = "";
    for (let i = 0; i < 4; i++) {
      haze += `<line x1="0" y1="${GY - 30 - i * 15}" x2="${W}" y2="${GY - 30 - i * 15}" stroke="var(--amber)" stroke-width=".5" opacity="${(.06 + rnd() * .08).toFixed(2)}">
        <animate attributeName="y1" values="${GY - 30 - i * 15};${GY - 32 - i * 15};${GY - 30 - i * 15}" dur="${(3 + i * .7).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="y2" values="${GY - 30 - i * 15};${GY - 32 - i * 15};${GY - 30 - i * 15}" dur="${(3 + i * .7).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
    // rubble floor
    let rubble = "";
    for (let i = 0; i < 12; i++) {
      rubble += `<polygon points="${(10 + rnd() * (W - 20)).toFixed(1)},${(GY + 10 + rnd() * 45).toFixed(1)} ${(20 + rnd() * (W - 30)).toFixed(1)},${(GY + 15 + rnd() * 45).toFixed(1)} ${(15 + rnd() * (W - 25)).toFixed(1)},${(GY + 20 + rnd() * 45).toFixed(1)}" fill="#4a3a2a" opacity="${(.2 + rnd() * .3).toFixed(2)}"/>`;
    }

    // pillars — column height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const pillars = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a6a4a";
      const ph = 30 + f * 95;
      const pw = 10 + f * 20;
      const tipY = GY - ph;
      // pillar body — chunky column with banded strata
      const body = `<path d="M ${cx - pw / 2} ${GY} L ${cx - pw * .45} ${tipY} L ${cx + pw * .45} ${tipY} L ${cx + pw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #2a2018)"/>`;
      // flat cap
      const cap = `<rect x="${cx - pw * .45}" y="${tipY - 2}" width="${pw * .9}" height="4" rx="1" fill="${hot ? "color-mix(in srgb, var(--red) 55%, #d8c8b0)" : "#d8c8b0"}" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      // strata bands
      const strata = `<line x1="${cx - pw * .42}" y1="${GY - ph * .35}" x2="${cx + pw * .42}" y2="${GY - ph * .35}" stroke="#5a4a3a" stroke-width=".7" opacity=".4"/>
        <line x1="${cx - pw * .38}" y1="${GY - ph * .65}" x2="${cx + pw * .38}" y2="${GY - ph * .65}" stroke="#5a4a3a" stroke-width=".7" opacity=".4"/>`;
      // hot cap pulse
      const ring = hot ? `<ellipse cx="${cx}" cy="${tipY - 2}" rx="${(pw * .55).toFixed(1)}" ry="${(pw * .2).toFixed(1)}" fill="none" stroke="var(--red)" stroke-width="1" opacity=".6">
        <animate attributeName="rx" values="${(pw * .55).toFixed(1)};${(pw * .8).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${(pw * .2).toFixed(1)};${(pw * .3).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="1.6s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ou-pillar${hot ? " hot" : ""}">
        ${body}${cap}${strata}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ou-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ou-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // lizards — sessions on the rubble
    const lizards = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 12);
      const y = GY - 4 - (i % 2) * 8;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#6a8a5a");
      return `<g class="ou-liz${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y};${W + 18} ${(y + 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .7}" fill="${col}"/>
        <circle cx="${size * 1.3}" cy="${-size * .2}" r="${size * .4}" fill="${col}"/>
        <line x1="${-size * 1.4}" y1="0" x2="${-size * 2.6}" y2="${-size * .4}" stroke="${col}" stroke-width=".8"/>
        <line x1="${-size * .8}" y1="${size * .5}" x2="${-size * 1.2}" y2="${size * 1.4}" stroke="${col}" stroke-width=".6"/>
        <line x1="${size * .8}" y1="${size * .5}" x2="${size * 1.2}" y2="${size * 1.4}" stroke="${col}" stroke-width=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ou-wrap">
        <div class="ou-head"><b>OUTCROP</b><span>岩柱=配额窗 高=用量 蜥=会话${hotN ? " · " + hotN + " 余烬" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #181008 65%, transparent)" rx="10"/>
          ${sun}${haze}${rubble}${pillars}${lizards}
          <g class="ou-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ou-k">${fmt(k.tokens)} · ${sessions.length} 蜥</text>
            <text x="22" y="45" class="ou-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "裸岩", eyebrow: "OUTCROP", render };
})();
