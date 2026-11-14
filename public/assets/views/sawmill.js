/* ------------------------------------------------------------------ sawmill
 * Sawmill — a cutting shed with circular saws: every quota
 * window is a log on the carriage (saw blade spin + sawdust =
 * used%, ≥85% the blade rim sparks amber); sessions are sawyers
 * (a cap + cant hook) guiding the cut.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sawmill";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const saws = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const sawY = floorY - 14;
      const sawR = 12 + f * 6;
      const spinDur = Math.max(0.5, 1.5 - f);
      const logY = sawY - sawR - 6;
      // sawdust puffs
      const puffs = hot ? Array.from({ length: 3 }, (_, pi) => {
        const dur = (0.8 + pi * 0.2).toFixed(1);
        return `<circle cx="${x + 2 + pi * 3}" cy="${sawY - sawR + 2}" r="1.5" fill="#c0a060" opacity=".7">
          <animate attributeName="cy" values="${sawY - sawR + 2};${sawY - sawR - 10};${sawY - sawR + 2}" dur="${dur}s" begin="${(-pi * 0.25).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".7;.1;.7" dur="${dur}s" begin="${(-pi * 0.25).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join("") : "";
      return `<g class="sx-saw${hot ? " hot" : ""}">
        <!-- log on carriage -->
        <line x1="${x - bw / 2 + 6}" y1="${logY}" x2="${x + bw / 2 - 6}" y2="${logY}" stroke="#4a3828" stroke-width="2"/>
        <rect x="${x - bw / 2 + 10}" y="${logY - 6}" width="${bw - 24}" height="6" rx="3" fill="#6a5038"/>
        <!-- saw blade -->
        <g transform="translate(${x} ${sawY - sawR / 2})">
          <g class="sx-blade">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${spinDur.toFixed(2)}s" repeatCount="indefinite"/>
            <circle r="${sawR.toFixed(1)}" fill="#384048" stroke="${hot ? "var(--amber)" : "#586070"}" stroke-width="${hot ? 1.5 : 1}"/>
            ${Array.from({ length: 12 }, (_, ti) => `<line x1="0" y1="0" x2="0" y2="${(-sawR).toFixed(1)}" stroke="${col}" stroke-width="1" opacity=".6" transform="rotate(${ti * 30})"/>`).join("")}
            ${Array.from({ length: 12 }, (_, ti) => `<polygon points="0,${(-sawR).toFixed(1)} -1.5,${(-sawR + 3).toFixed(1)} 1.5,${(-sawR + 3).toFixed(1)}" fill="${col}" transform="rotate(${ti * 30})"/>`).join("")}
          </g>
          <circle r="3" fill="${hot ? "var(--amber)" : "#384048"}"/>
        </g>
        ${puffs}
        <text x="${x}" y="${sawY + 18}" class="sx-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${sawY + 27}" class="sx-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // sawyers — cap + cant hook
    const sawyers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="sx-sawyer${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L10 -8 L9 -11 L3 -7 Z" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sx-wrap">
        <div class="sx-head"><b>SAWMILL</b><span>圆锯=配额窗 转速=用量 锯屑=过热 锯工=会话${hotN ? " · " + hotN + " 飞" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14120e" rx="10"/>
          ${saws}${sawyers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="sx-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="sx-ksub" text-anchor="end">锯齿=圆刃</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锯木厂", eyebrow: "SAWMILL", render };
})();
