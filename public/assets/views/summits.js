/* ------------------------------------------------------------------ summits
 * Summits — a range of mountain summits at dawn: every quota
 * window is a peak whose height = used % (≥85% the summit
 * glows amber); sessions are climbers ascending the faces.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "summits";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 234;

    // dawn sky
    const sky = `<defs><linearGradient id="sm-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a4060"/><stop offset="100%" stop-color="#6a7088"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sm-s)" rx="10"/>`;
    // alpine glow on ridge
    const glow = `<rect x="0" y="${GY - 15}" width="${W}" height="15" fill="#c8a070" opacity=".15"/>`;
    // base range
    const range = `<path d="M 0 ${GY} L 0 ${GY - 30} L 50 ${GY - 50} L 110 ${GY - 28} L 170 ${GY - 55} L 240 ${GY - 35} L 310 ${GY - 50} L 370 ${GY - 42} L 400 ${GY - 45} L 400 ${GY} Z" fill="#4a5060" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #5a6070 60%, var(--card-2))"/>`;
    // scree
    let scree = "";
    for (let i = 0; i < 12; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 25).toFixed(1)}" fill="#6a7080" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // summits — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const summits = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a90a0";
      const sh = 25 + f * 85;
      const sw = 15 + f * 25;
      const topY = GY - sh;
      // peak — triangular with snow cap
      const body = `<path d="M ${cx - sw / 2} ${GY} L ${cx} ${topY} L ${cx + sw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #4a5060)"/>`;
      // snow cap
      const snow = `<path d="M ${cx - sw * .25} ${topY + sh * .25} L ${cx} ${topY} L ${cx + sw * .25} ${topY + sh * .25} Z" fill="#e0e8f0" opacity=".7"/>`;
      // shadow face
      const shadow = `<path d="M ${cx - sw * .2} ${topY + sh * .2} L ${cx - sw * .4} ${GY - sh * .3} L ${cx} ${GY} Z" fill="${col}" opacity=".2"/>`;
      // hot amber summit
      const hotGlow = hot ? `<circle cx="${cx}" cy="${topY}" r="${(4 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(4 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="sm-sum${hot ? " hot" : ""}">
        ${body}${snow}${shadow}${hotGlow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // climbers — ascending
    const climbers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 16 - (s.tps || 0) / 11);
      const y = GY - 20 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0d0b0");
      return `<g class="sm-climb${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 15).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .4}" fill="${col}"/>
        <circle cx="${size * .5}" cy="${-size * .2}" r="${size * .2}" fill="${col}"/>
        <path d="M ${-size * .4} ${size * .2} L ${-size * .9} ${size * .6}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * .4} ${size * .2} L ${size * .8} ${size * .5}" stroke="${col}" stroke-width=".6" fill="none"/>
        <line x1="0" y1="0" x2="0" y2="${-size * .8}" stroke="${col}" stroke-width=".5" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sm-wrap">
        <div class="sm-head"><b>SUMMITS</b><span>群峰=配额窗 高=用量 攀登者=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${glow}${range}${ground}${scree}${summits}${climbers}
          <g class="sm-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sm-k">${fmt(k.tokens)} · ${sessions.length} 攀</text>
            <text x="22" y="45" class="sm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "群峰", eyebrow: "SUMMITS", render };
})();
