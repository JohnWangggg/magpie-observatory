/* -------------------------------------------------------------------- onsen
 * Onsen — hot-spring pools in a snow garden: every quota window
 * is a round pool whose water level = used %; steam wisps rise
 * from hot pools; sessions are bathers (a head + shoulders)
 * drifting between pools. Lanterns mark the evening.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "onsen";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11020304);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 36, BOT = 40;
    const cols = 3, rows = Math.ceil(quotas.length / cols);
    const pw = (W - 40) / cols, ph = Math.min(94, (H - TOP - BOT) / rows);

    const pools = quotas.map((w, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = 20 + col * pw + pw / 2;
      const cy = TOP + row * (ph + 4) + ph / 2;
      const r = Math.min(pw, ph) / 2 - 8;
      const f = Math.min(1, w.used / 100);
      const m = metaOf(pmeta, w.prov);
      const col2 = m.color || "#8ab4f8";
      const hot = w.used >= 85;
      // water clip
      const wy = cy + r * (1 - 2 * f);
      const steam = hot ? `<g class="on-steam">
          <path d="M${cx - 8} ${cy - r - 4} q -3 -8 0 -14 q 3 -6 0 -12" fill="none" stroke="#cfd8dc" stroke-width="1.6" opacity=".55">
            <animate attributeName="d" values="M${cx - 8} ${cy - r - 4} q -3 -8 0 -14 q 3 -6 0 -12;M${cx - 8} ${cy - r - 10} q -3 -8 0 -14 q 3 -6 0 -12;M${cx - 8} ${cy - r - 4} q -3 -8 0 -14 q 3 -6 0 -12" dur="3s" repeatCount="indefinite"/></path>
          <path d="M${cx + 6} ${cy - r - 2} q 3 -9 0 -16 q -3 -7 0 -13" fill="none" stroke="#cfd8dc" stroke-width="1.4" opacity=".4">
            <animate attributeName="d" values="M${cx + 6} ${cy - r - 2} q 3 -9 0 -16 q -3 -7 0 -13;M${cx + 6} ${cy - r - 8} q 3 -9 0 -16 q -3 -7 0 -13;M${cx + 6} ${cy - r - 2} q 3 -9 0 -16 q -3 -7 0 -13" dur="3.6s" begin="-1.2s" repeatCount="indefinite"/></path>
        </g>` : "";
      return `<g class="on-pool${hot ? " hot" : ""}">
        <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="#2e3a42"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1d2830"/>
        <clipPath id="on-clip-${i}"><circle cx="${cx}" cy="${cy}" r="${r - 1}"/></clipPath>
        <g clip-path="url(#on-clip-${i})">
          <rect x="${cx - r}" y="${wy.toFixed(1)}" width="${r * 2}" height="${(r * 2 * f).toFixed(1)}" fill="${col2}" opacity=".82">
            <animate attributeName="opacity" values=".82;.7;.82" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/></rect>
          <ellipse cx="${cx}" cy="${wy.toFixed(1)}" rx="${r * .9}" ry="3" fill="${col2}" opacity=".6"/>
        </g>
        ${steam}
        <text x="${cx}" y="${cy + 3}" class="on-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx}" y="${cy + r + 14}" class="on-name" text-anchor="middle">${esc(w.name.slice(0, 7))}</text>
        ${hot ? `<circle cx="${cx + r - 4}" cy="${cy - r + 4}" r="4" fill="var(--amber)">
          <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    const bathers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0c8a0");
      const dur = Math.max(9, 20 - (s.tps || 0) / 8);
      const y = TOP + (i * ph + ph / 2) % (H - TOP - BOT);
      return `<g class="on-bather${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-4" r="5" fill="${col}"/>
        <ellipse cx="0" cy="4" rx="9" ry="4" fill="${col}" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="on-wrap">
        <div class="on-head"><b>ONSEN</b><span>汤池=配额窗 水位=用量 蒸汽=过热 浴客=会话${hotN ? " · " + hotN + " 沸" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${pools}${bathers}
          <text x="16" y="${H - 18}" class="on-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="on-ksub" text-anchor="end">石圈=池沿</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "温泉", eyebrow: "ONSEN", render };
})();
