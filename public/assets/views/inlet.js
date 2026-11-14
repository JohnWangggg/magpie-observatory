/* ------------------------------------------------------------------ inlet
 * Inlet — narrow bay cutting into a forested headland: every quota
 * window is a buoy whose waterline depth = used % (≥85% the buoy
 * tips and flashes red); sessions are gulls riding the tide.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "inlet";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 226, BY = 240;

    // headland backdrop — treed hill on the right
    const hill = `<path d="M ${W - 140} ${GY} Q ${W - 100} ${GY - 60} ${W - 60} ${GY - 80} Q ${W - 20} ${GY - 90} ${W} ${GY - 70} L ${W} ${GY} Z" fill="color-mix(in srgb, #2a3a2a 60%, var(--card-2))" opacity=".8"/>`;
    // water — two-tone (shallows near shore, deep at center)
    const water = `<rect x="0" y="${BY}" width="${W}" height="${H - BY}" fill="color-mix(in srgb, #1a3a3a 70%, var(--card-2))"/>`;
    // tide line
    const tide = `<line x1="0" y1="${BY}" x2="${W}" y2="${BY}" stroke="#3a5a5a" stroke-width=".8" opacity=".5">
      <animate attributeName="y1" values="${BY};${BY - 2};${BY}" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="y2" values="${BY};${BY - 2};${BY}" dur="4s" repeatCount="indefinite"/></line>`;
    // sand spit
    const spit = `<path d="M 30 ${BY + 8} Q 120 ${BY - 4} 200 ${BY + 12} Q 200 ${BY + 20} 120 ${BY + 24} Q 30 ${BY + 18} 30 ${BY + 8} Z" fill="#c8b8a0" opacity=".7"/>`;
    // pine silhouettes on the hill
    let pines = "";
    for (let i = 0; i < 5; i++) {
      const px = W - 130 + i * 26;
      const ph = 10 + rnd() * 12;
      pines += `<path d="M ${px} ${GY - 20 - i * 8} L ${px - 5} ${GY - 20 - i * 8 - ph} L ${px + 5} ${GY - 20 - i * 8 - ph} Z" fill="#1a2a1a" opacity=".8"/>`;
    }

    // buoys — waterline depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 100) / n;
    const buoys = quotas.map((w, i) => {
      const cx = 50 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d86a4a";
      // buoy — red top, striped body, depth of submersion
      const bh = 16 + f * 20;
      const bw = 8 + f * 6;
      const topY = BY - bh;
      const tipAngle = hot ? -8 : 0;
      return `<g class="in-buoy${hot ? " hot" : ""}" transform="translate(${cx.toFixed(1)} ${BY}) rotate(${tipAngle})">
        <path d="M ${-bw / 2} 0 L ${-bw * .35} ${-bh} L ${bw * .35} ${-bh} L ${bw / 2} 0 Z" fill="color-mix(in srgb, ${col} 65%, #c84030)"/>
        <rect x="${-bw * .35}" y="${-bh}" width="${bw * .7}" height="3" rx="1" fill="${hot ? "var(--red)" : "#e8d8c0"}"/>
        <line x1="${-bw * .3}" y1="${-bh * .3}" x2="${bw * .3}" y2="${-bh * .3}" stroke="#f0e0d0" stroke-width="1.2" opacity=".7"/>
        ${hot ? `<circle cx="0" cy="${-bh - 4}" r="2.5" fill="var(--red)" opacity=".8">
          <animate attributeName="opacity" values=".8;.2;.8" dur="1s" repeatCount="indefinite"/></circle>` : ""}
        <text x="0" y="20" class="in-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="0" y="31" class="in-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // gulls — sessions riding the tide
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const y = BY - 15 - (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      return `<g class="in-gull${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-20} ${y} Q ${W * .4} ${y - 18} ${W * .6} ${y + 5} T ${W + 20} ${y - 12}"/>
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
      <div class="in-wrap">
        <div class="in-head"><b>INLET</b><span>浮标=配额窗 深=用量 鸥=会话${hotN ? " · " + hotN + " 倾侧" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #162028 60%, transparent)" rx="10"/>
          ${hill}${pines}${water}${spit}${tide}${buoys}${gulls}
          <g class="in-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="in-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="in-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "入湾", eyebrow: "INLET", render };
})();
