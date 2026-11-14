/* ------------------------------------------------------------------ inlets
 * Inlets — narrow sea inlets cutting into rocky coast: every
 * quota window is a headland point whose height = used %
 * (≥85% the beacon burns amber); sessions are cormorants
 * diving for fish.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "inlets";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(13004466);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 252;

    // coastal sky
    const sky = `<defs><linearGradient id="im-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8c0d0"/><stop offset="100%" stop-color="#c8d8e0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#im-s)" rx="10"/>`;
    // sea
    const sea = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #487088 65%, var(--card-2))"/>`;
    // swell lines
    let swells = "";
    for (let i = 0; i < 6; i++) {
      swells += `<path d="M ${(rnd() * W).toFixed(1)} ${(WY + 10 + rnd() * 40).toFixed(1)} q 20 ${(rnd() * 3 - 1).toFixed(1)} 40 ${(rnd() * 3 - 1).toFixed(1)}" stroke="#88b0c8" stroke-width=".8" fill="none" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<path d="M 0 ${GY} L 0 ${GY - 12} L 50 ${GY - 18} L 120 ${GY - 10} L 190 ${GY - 20} L 260 ${GY - 12} L 330 ${GY - 18} L 400 ${GY - 15} L 400 ${GY} Z" fill="#686058" opacity=".6"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #787068 60%, var(--card-2))"/>`;

    // headlands — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const heads = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#687888";
      const hh = 20 + f * 75;
      const hw = 15 + f * 25;
      const topY = WY - hh;
      // headland — rocky point jutting into the sea
      const point = `<path d="M ${cx - hw / 2} ${WY + 15} L ${cx - hw * .35} ${topY + 15} L ${cx} ${topY} L ${cx + hw * .35} ${topY + 12} L ${cx + hw / 2} ${WY + 15} Z" fill="color-mix(in srgb, ${col} 60%, #585860)"/>`;
      // grass cap
      const cap = `<path d="M ${cx - hw * .3} ${topY + 12} L ${cx} ${topY + 2} L ${cx + hw * .3} ${topY + 10} L ${cx + hw * .15} ${topY + 18} L ${cx - hw * .15} ${topY + 18} Z" fill="color-mix(in srgb, #588048 60%, ${col})" opacity=".7"/>`;
      // beacon pole
      const pole = `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${topY - 10}" stroke="#585858" stroke-width="1.5"/>`;
      // beacon light
      const beacon = `<circle cx="${cx}" cy="${topY - 12}" r="${hot ? 4 : 2.5}" fill="${hot ? "var(--amber)" : "#d0d8e0"}" opacity="${hot ? ".8" : ".5"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${topY - 12}" r="8" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="8;13" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // wave crashing at the point
      const wave = `<path d="M ${cx - hw * .4} ${WY + 12} Q ${cx} ${WY + 4} ${cx + hw * .4} ${WY + 12}" stroke="#c8e0f0" stroke-width="1.5" fill="none" opacity=".5">
        <animate attributeName="opacity" values=".5;.2;.5" dur="${(2 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      return `<g class="im-head${hot ? " hot" : ""}">
        ${point}${cap}${pole}${beacon}${glow}${wave}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="im-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="im-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // cormorants — diving for fish
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#283038");
      const x0 = 40 + rnd() * (W - 80);
      const y0 = 60 + (i % 3) * 20;
      const diveY = WY + 15;
      return `<g class="im-corm${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${x0} ${y0} Q ${x0 + 30} ${(y0 + diveY) / 2} ${x0 + 50} ${diveY} Q ${x0 + 30} ${(y0 + diveY) / 2 - 15} ${x0} ${y0}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${size * .8} ${-size * .1} Q ${size * 1.4} ${-size * .5} ${size * 1.8} ${-size * .3}" stroke="${col}" stroke-width="1.5" fill="none"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.7} ${-size * .5} L ${-size * 1.7} ${size * .5} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="im-wrap">
        <div class="im-head-row"><b>INLETS</b><span>岬=配额窗 高=用量 鸬鹚=会话${hotN ? " · " + hotN + " 燃灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${swells}${shore}${ground}${heads}${birds}
          <g class="im-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="im-k">${fmt(k.tokens)} · ${sessions.length} 鹚</text>
            <text x="22" y="45" class="im-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "入海岬", eyebrow: "INLETS", render };
})();
