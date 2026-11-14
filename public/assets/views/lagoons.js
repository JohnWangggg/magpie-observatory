/* ------------------------------------------------------------------ lagoons
 * Lagoons — still coastal lagoons behind sandbars: every
 * quota window is a lagoon pool whose size = used % (≥85%
 * the moored dinghy lantern burns amber); sessions are
 * flamingos wading the shallows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lagoons";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(19660022);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // dusk sky
    const sky = `<defs><linearGradient id="lv-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8b8a0"/><stop offset="100%" stop-color="#f0d8b8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#lv-s)" rx="10"/>`;
    // sandbar
    const bar = `<path d="M 0 ${GY - 80} Q 100 ${GY - 95} 200 ${GY - 85} Q 300 ${GY - 98} 400 ${GY - 88} L 400 ${GY - 78} Q 300 ${GY - 88} 200 ${GY - 78} Q 100 ${GY - 88} 0 ${GY - 72} Z" fill="color-mix(in srgb, #d0b888 65%, var(--card-2))"/>`;
    // lagoon water
    const water = `<path d="M 0 ${GY} L 0 ${GY - 72} Q 100 ${GY - 88} 200 ${GY - 78} Q 300 ${GY - 88} 400 ${GY - 78} L 400 ${GY} Z" fill="color-mix(in srgb, #78a8b0 55%, var(--card-2))"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c0a878 60%, var(--card-2))"/>`;
    // palm silhouettes on the bar
    let palms = "";
    for (let i = 0; i < 4; i++) {
      const px = 50 + i * 100;
      const py = GY - 85;
      palms += `<path d="M ${px} ${py} Q ${px - 3} ${py - 15} ${px - 1} ${py - 22}" stroke="#584838" stroke-width="1.5" fill="none" opacity=".5"/>
        <path d="M ${px - 1} ${py - 22} L ${px - 9} ${py - 18} M ${px - 1} ${py - 22} L ${px + 6} ${py - 19} M ${px - 1} ${py - 22} L ${px - 6} ${py - 27}" stroke="#486038" stroke-width="1.5" fill="none" opacity=".5"/>`;
    }

    // lagoon pools — size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const pools = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = GY - 35;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#48a0b8";
      const pr = 10 + f * 26;
      // pool — deep spot in the lagoon
      const pool = `<ellipse cx="${cx}" cy="${cy}" rx="${pr}" ry="${pr * .5}" fill="color-mix(in srgb, ${col} 65%, #387078)" opacity=".85"/>`;
      const inner = `<ellipse cx="${cx}" cy="${cy}" rx="${pr * .6}" ry="${pr * .3}" fill="color-mix(in srgb, ${col} 45%, #285860)" opacity=".7"/>`;
      // dinghy
      const bx = cx + pr * .4;
      const by = cy - pr * .3;
      const dinghy = `<path d="M ${bx - 8} ${by} L ${bx - 6} ${by + 4} L ${bx + 6} ${by + 4} L ${bx + 8} ${by} Z" fill="#785838"/>
        <line x1="${bx}" y1="${by}" x2="${bx}" y2="${by - 10}" stroke="#685848" stroke-width="1.2"/>
        <path d="M ${bx} ${by - 10} L ${bx + 7} ${by - 4} L ${bx} ${by - 4} Z" fill="#e8e0d0" opacity=".85"/>`;
      // lantern
      const lamp = `<circle cx="${bx - 6}" cy="${by - 2}" r="${hot ? 2.5 : 1.5}" fill="${hot ? "var(--amber)" : "#d0c8b0"}" opacity="${hot ? ".9" : ".5"}"/>`;
      const glow = hot ? `<circle cx="${bx - 6}" cy="${by - 2}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="lv-pool${hot ? " hot" : ""}">
        ${pool}${inner}${dinghy}${lamp}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="lv-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="lv-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // flamingos — wading
    const flams = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 15 - (s.tps || 0) / 12);
      const lvl = i % quotas.length || 0;
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length)) - 15;
      const y = GY - 30;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e888a0");
      const rx2 = 8 + rnd() * 6;
      return `<g class="lv-flam${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} L ${(cx2 + rx2).toFixed(1)} ${y} L ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size}" ry="${size * .5}" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .2} Q ${size * .8} ${-size * 1.4} ${size * 1.3} ${-size * .9}" stroke="${col}" stroke-width="1.2" fill="none"/>
        <circle cx="${size * 1.3}" cy="${-size * .9}" r="${size * .22}" fill="${col}"/>
        <path d="M ${size * 1.4} ${-size * .8} L ${size * 1.9} ${-size * .6}" stroke="#383838" stroke-width=".7" fill="none"/>
        <line x1="${size * .1}" y1="${size * .4}" x2="${size * .1}" y2="${size * 1.5}" stroke="${col}" stroke-width=".4"/>
        <line x1="${-size * .2}" y1="${size * .4}" x2="${-size * .4}" y2="${size * 1.3}" stroke="${col}" stroke-width=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lv-wrap">
        <div class="lv-head"><b>LAGOONS</b><span>澙湖=配额窗 池径=用量 火烈鸟=会话${hotN ? " · " + hotN + " 燃灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${bar}${water}${ground}${palms}${pools}${flams}
          <g class="lv-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="lv-k">${fmt(k.tokens)} · ${sessions.length} 鹳</text>
            <text x="22" y="45" class="lv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "泻湖", eyebrow: "LAGOONS", render };
})();
