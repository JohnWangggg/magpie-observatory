/* ------------------------------------------------------------------- cape
 * Cape — a rocky promontory into a bright sea: every quota window
 * is a headland whose height = used % (≥85% the crest burns);
 * sessions are seagulls riding the offshore wind.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cape";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99001122);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 230, SY = 244;

    // bright sea
    const sea = `<rect x="0" y="${SY}" width="${W}" height="${H - SY}" fill="color-mix(in srgb, #2a5a6a 65%, var(--card-2))"/>`;
    // distant headland silhouette
    const far = `<path d="M 0 ${GY} L 40 ${GY - 30} L 120 ${GY - 15} L 200 ${GY - 40} L 300 ${GY - 20} L 400 ${GY - 35} L 400 ${GY} Z" fill="color-mix(in srgb, #3a4a4a 60%, transparent)" opacity=".7"/>`;
    // wave lines
    let waves = "";
    for (let i = 0; i < 5; i++) {
      waves += `<line x1="${20 + i * 80}" y1="${SY + 8 + rnd() * 30}" x2="${60 + i * 80}" y2="${SY + 8 + rnd() * 30}" stroke="#5a8a8a" stroke-width=".6" opacity="${(.12 + rnd() * .16).toFixed(2)}">
        <animate attributeName="x1" values="${20 + i * 80};${30 + i * 80};${20 + i * 80}" dur="${(3 + i * .5).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="x2" values="${60 + i * 80};${70 + i * 80};${60 + i * 80}" dur="${(3 + i * .5).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
    // foam on the rocks
    let foam = "";
    for (let i = 0; i < 8; i++) {
      foam += `<ellipse cx="${(30 + rnd() * (W - 60)).toFixed(1)}" cy="${(SY + 4 + rnd() * 30).toFixed(1)}" rx="${(3 + rnd() * 6).toFixed(1)}" ry="${(1 + rnd() * 1.5).toFixed(1)}" fill="#e8f0e8" opacity="${(.15 + rnd() * .25).toFixed(2)}"/>`;
    }

    // headlands — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const capes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a5a4a";
      const ch = 30 + f * 85;
      const cw = 14 + f * 22;
      const tipY = GY - ch;
      // headland body — sloping into the sea
      const body = `<path d="M ${cx - cw} ${GY} Q ${cx - cw * .4} ${GY - ch * .6} ${cx} ${tipY} Q ${cx + cw * .4} ${GY - ch * .4} ${cx + cw} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #2a2018)"/>`;
      // crest highlight
      const crest = `<path d="M ${cx - cw * .7} ${GY - ch * .15} L ${cx} ${tipY} L ${cx + cw * .5} ${GY - ch * .1}" stroke="${hot ? "var(--amber)" : "#d0c0a0"}" stroke-width="1.5" fill="none" opacity="${(.5 + f * .4).toFixed(2)}" stroke-linecap="round"/>`;
      // hot crest burn
      const burn = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      // strata
      const strata = `<path d="M ${cx - cw * .5} ${GY - ch * .3} L ${cx - cw * .1} ${GY - ch * .55}" stroke="#4a3a2a" stroke-width=".6" opacity=".35"/>
        <path d="M ${cx + cw * .5} ${GY - ch * .25} L ${cx + cw * .1} ${GY - ch * .5}" stroke="#4a3a2a" stroke-width=".6" opacity=".35"/>`;
      return `<g class="ca-cape${hot ? " hot" : ""}">
        ${body}${crest}${strata}${burn}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ca-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ca-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // seagulls — sessions riding the wind
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 15);
      const y = GY - 20 - (i % 3) * 14;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#f0e8d8");
      return `<g class="ca-gull${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-20} ${y} Q ${W * .4} ${y - 20} ${W * .6} ${y + 10} T ${W + 20} ${y - 15}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .8} 0 Q ${-size * 1.6} ${-size * .8} ${-size * 2} ${-size * .2}" stroke="${col}" stroke-width=".7" fill="none"/>
        <path d="M ${size * .8} 0 Q ${size * 1.6} ${-size * .8} ${size * 2} ${-size * .2}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ca-wrap">
        <div class="ca-head"><b>CAPE</b><span>海岬=配额窗 高=用量 鸥=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2830 60%, transparent)" rx="10"/>
          ${far}${sea}${waves}${foam}${capes}${gulls}
          <g class="ca-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ca-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="ca-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海角", eyebrow: "CAPE", render };
})();
