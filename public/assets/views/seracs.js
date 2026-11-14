/* ------------------------------------------------------------------ seracs
 * Seracs — tottering ice towers in a collapsing icefall:
 * every quota window is a serac whose lean = used % (≥85%
 * the fractured crest burns amber); sessions are ravens
 * wheeling above the tumble.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "seracs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(34104465);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // high cold sky
    const sky = `<defs><linearGradient id="se-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5878a0"/><stop offset="100%" stop-color="#a0b8cc"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#se-s)" rx="10"/>`;
    // icefall slope
    const slope = `<path d="M 0 ${GY - 40} L 400 ${GY - 10} L 400 ${GY} L 0 ${GY} Z" fill="#c8dce4"/>`;
    // rubble at the base
    let rubble = "";
    for (let i = 0; i < 12; i++) {
      rubble += `<polygon points="${(rnd() * W).toFixed(1)},${(GY - 2 + rnd() * 6).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 4 + rnd() * 6).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 8 + rnd() * 4).toFixed(1)}" fill="#b0c8d4" opacity="${(.5 + rnd() * .2).toFixed(2)}"/>`;
    }
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #a8c0cc 60%, var(--card-2))"/>`;

    // seracs — lean = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const towers = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const baseY = GY - 30 + i * 4;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#98c0d0";
      const th = 30 + f * 55;
      const tw = 14 + f * 8;
      const lean = f * 18; // degrees
      // leaning tower — parallelogram
      const topX = cx + Math.sin(lean * Math.PI / 180) * th;
      const tower = `<polygon points="${cx - tw / 2},${baseY} ${cx + tw / 2},${baseY} ${topX + tw * .4},${baseY - th} ${topX - tw * .4},${baseY - th}" fill="color-mix(in srgb, ${col} 60%, #a8c8d4)" stroke="#88a8b8" stroke-width=".8"/>`;
      // fracture lines
      const frac = `<path d="M ${cx - tw * .2} ${baseY - th * .3} L ${topX + tw * .1} ${baseY - th * .35} M ${cx} ${baseY - th * .6} L ${topX + tw * .2} ${baseY - th * .65}" stroke="#e8f4f8" stroke-width=".8" opacity=".7"/>`;
      // crest shard
      const crest = `<polygon points="${topX - tw * .4},${baseY - th} ${topX + tw * .4},${baseY - th} ${topX},${baseY - th - 6}" fill="${hot ? "var(--amber)" : "#e8f4f8"}" opacity="${hot ? ".85" : ".9"}"/>`;
      const glow = hot ? `<circle cx="${topX}" cy="${baseY - th - 3}" r="7" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // fallen blocks at base
      const fallen = `<polygon points="${cx - tw * .8},${baseY} ${cx - tw * .5},${baseY - 4} ${cx - tw * .2},${baseY}" fill="#a0c0cc"/>`;
      return `<g class="se-tower${hot ? " hot" : ""}">
        ${tower}${frac}${crest}${fallen}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="se-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="se-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ravens — wheeling above
    const ravens = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 13);
      const cx2 = 80 + (i * 60) % (W - 160);
      const y = 55 + (i % 3) * 25;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#202830");
      return `<g class="se-raven${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${cx2} ${y} a 28 14 0 1 1 56 0 a 28 14 0 1 1 -56 0"/>
        <ellipse cx="0" cy="0" rx="${size * .7}" ry="${size * .35}" fill="${col}"/>
        <path d="M ${size * .4} ${-size * .1} L ${size * .9} ${-size * .2} L ${size * .6} ${size * .15} Z" fill="${col}"/>
        <path d="M ${-size * .3} ${-size * .2} Q ${-size * 1.4} ${-size * .9} ${-size * 1.6} ${-size * .2} L ${-size * .9} ${size * .1} Z" fill="${col}"/>
        <path d="M ${size * .3} ${-size * .2} Q ${size * 1.2} ${-size * .8} ${size * 1.5} ${-size * .1} L ${size * .9} ${size * .1} Z" fill="${col}" opacity=".85"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="se-wrap">
        <div class="se-head"><b>SERACS</b><span>冰塔=配额窗 倾角=用量 渡鸦=会话${hotN ? " · " + hotN + " 燃冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${slope}${rubble}${ground}${towers}${ravens}
          <g class="se-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="se-k">${fmt(k.tokens)} · ${sessions.length} 鸦</text>
            <text x="22" y="45" class="se-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰塔", eyebrow: "SERACS", render };
})();
