/* ------------------------------------------------------------------ shoals
 * Shoals — underwater sand shoals in a wide estuary: every
 * quota window is a shoal whose dune height = used % (≥85%
 * the channel beacon burns amber); sessions are terns
 * plunge-diving.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shoals";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(20771133);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 190, GY = 248;

    // estuary sky
    const sky = `<defs><linearGradient id="sj-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b0c8d8"/><stop offset="100%" stop-color="#d0dce0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sj-s)" rx="10"/>`;
    // water
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #5088a0 60%, var(--card-2))"/>`;
    // wave caps
    let caps = "";
    for (let i = 0; i < 7; i++) {
      caps += `<path d="M ${(rnd() * W).toFixed(1)} ${(WY + 8 + rnd() * 45).toFixed(1)} q 15 ${(rnd() * 3 - 1).toFixed(1)} 30 ${(rnd() * 3 - 1).toFixed(1)}" stroke="#a8d0e0" stroke-width=".8" fill="none" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<path d="M 0 ${GY} L 0 ${GY - 10} L 60 ${GY - 16} L 130 ${GY - 8} L 200 ${GY - 18} L 270 ${GY - 10} L 340 ${GY - 15} L 400 ${GY - 12} L 400 ${GY} Z" fill="#a89870" opacity=".6"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #988860 60%, var(--card-2))"/>`;

    // shoals — dune height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const dunes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c0b088";
      const dh = 8 + f * 40;
      const dw = 18 + f * 30;
      const topY = WY + 45 - dh;
      // sand shoal breaking the surface
      const shoal = `<path d="M ${cx - dw / 2} ${WY + 45} Q ${cx - dw * .2} ${topY} ${cx} ${topY - 3} Q ${cx + dw * .25} ${topY + 2} ${cx + dw / 2} ${WY + 45} Z" fill="color-mix(in srgb, ${col} 70%, #a89060)"/>`;
      // ripple marks on the shoal
      const mark1 = `<path d="M ${cx - dw * .3} ${topY + 12} Q ${cx} ${topY + 8} ${cx + dw * .3} ${topY + 12}" stroke="#988058" stroke-width=".8" fill="none" opacity=".5"/>`;
      const mark2 = `<path d="M ${cx - dw * .35} ${topY + 22} Q ${cx} ${topY + 17} ${cx + dw * .35} ${topY + 22}" stroke="#988058" stroke-width=".7" fill="none" opacity=".4"/>`;
      // water edge
      const edge = `<path d="M ${cx - dw / 2} ${WY + 43} Q ${cx - dw * .2} ${WY + 38} ${cx} ${WY + 40} Q ${cx + dw * .25} ${WY + 42} ${cx + dw / 2} ${WY + 43}" stroke="#c8e0e8" stroke-width="1" fill="none" opacity=".5"/>`;
      // channel beacon
      const beacon = `<line x1="${cx + dw * .45}" y1="${WY + 40}" x2="${cx + dw * .45}" y2="${WY + 22}" stroke="#685848" stroke-width="1.5"/>
        <circle cx="${cx + dw * .45}" cy="${WY + 19}" r="${hot ? 3.5 : 2}" fill="${hot ? "var(--amber)" : "#c05040"}"/>`;
      const glow = hot ? `<circle cx="${cx + dw * .45}" cy="${WY + 19}" r="7" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="sj-shoal${hot ? " hot" : ""}">
        ${shoal}${mark1}${mark2}${edge}${beacon}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sj-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sj-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // terns — plunge-diving
    const terns = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8ecef");
      const x0 = 60 + (i * 80) % (W - 100);
      const y0 = 50 + (i % 3) * 15;
      return `<g class="sj-tern${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${x0} ${y0} Q ${x0 + 20} ${(y0 + WY) / 2} ${x0 + 35} ${WY + 10} Q ${x0 + 20} ${(y0 + WY) / 2 - 20} ${x0} ${y0}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.8} ${-size * .5} L ${-size * 1.8} ${size * .5} Z" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .1}" r="${size * .22}" fill="${col}"/>
        <path d="M ${-size * .2} ${-size * .3} L ${-size * .7} ${-size * .9}" stroke="${col}" stroke-width=".6" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sj-wrap">
        <div class="sj-head"><b>SHOALS</b><span>浅洲=配额窗 丘高=用量 燕鸥=会话${hotN ? " · " + hotN + " 燃标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${water}${caps}${shore}${ground}${dunes}${terns}
          <g class="sj-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sj-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="sj-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浅洲", eyebrow: "SHOALS", render };
})();
