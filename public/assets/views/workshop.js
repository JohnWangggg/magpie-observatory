/* ----------------------------------------------------------------- workshop
 * Workshop — a bench of workstations: every quota window is a
 * bench with a tool tray and a progress arm (used% = arm sweep,
 * ≥85% the arm sparks amber); sessions are workers moving
 * between benches under the hanging lamps.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "workshop";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 42, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    const benches = quotas.map((w, i) => {
      const x = 12 + i * bw;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08060";
      const hot = w.used >= 85;
      const stallW = bw - 10;
      const benchY = TOP + bh - 40;
      // progress arm — a needle sweeping from left-vertical to right
      const sweep = -90 + Math.min(1, w.used / 100) * 180;
      const armLen = 22;
      const armX = x + bw / 2 - 5, armY = benchY - 6;
      return `<g class="wk-bench${hot ? " hot" : ""}">
        <!-- hanging lamp -->
        <line x1="${x + bw / 2 - 5}" y1="${TOP - 14}" x2="${x + bw / 2 - 5}" y2="${TOP - 2}" stroke="var(--line-2)" stroke-width="1.5"/>
        <path d="M${x + bw / 2 - 14} ${TOP} L${x + bw / 2 - 5} ${TOP - 8} L${x + bw / 2 + 4} ${TOP} Z" fill="#2a2f38"/>
        <circle cx="${x + bw / 2 - 5}" cy="${TOP + 2}" r="4" fill="#f8e0a0" opacity="${hot ? .95 : .7}">
          ${hot ? `<animate attributeName="opacity" values=".95;.6;.95" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>
        <!-- bench -->
        <rect x="${x + 4}" y="${benchY}" width="${stallW}" height="38" rx="3" fill="#1a2128" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x + 4}" y="${benchY}" width="${stallW}" height="6" rx="3" fill="${col}" opacity=".7"/>
        <!-- progress arm -->
        <g class="wk-arm" transform="translate(${armX} ${armY})">
          <line x1="0" y1="0" x2="0" y2="${-armLen}" stroke="#384048" stroke-width="2.5" stroke-linecap="round"/>
          <g transform="rotate(${sweep.toFixed(1)})">
            <line x1="0" y1="0" x2="0" y2="${-armLen}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="0" cy="${-armLen}" r="3" fill="${col}"/>
            ${hot ? `<circle cx="0" cy="${-armLen}" r="5" fill="var(--amber)" opacity=".4">
              <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite"/></circle>` : ""}
          </g>
          <circle cx="0" cy="0" r="3.5" fill="#384048"/>
        </g>
        <text x="${x + bw / 2 - 5}" y="${benchY + 26}" class="wk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x + bw / 2 - 5}" y="${benchY + 35}" class="wk-name" text-anchor="middle">${esc(w.name.slice(0, 6))}</text>
      </g>`;
    }).join("");

    // workers — head + body walking between benches
    const workers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a080");
      const dur = Math.max(10, 20 - (s.tps || 0) / 10);
      const y = TOP + bh - 6 - (i % 2) * 3;
      return `<g class="wk-worker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2.5" fill="${col}" opacity=".9"/>
        <rect x="-4" y="4" width="3" height="6" rx="1" fill="#384048"/>
        <rect x="1" y="4" width="3" height="6" rx="1" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wk-wrap">
        <div class="wk-head"><b>WORKSHOP</b><span>工位=配额窗 摆臂=用量 吊灯=过热 工人=会话${hotN ? " · " + hotN + " 亮灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${benches}${workers}
          <line x1="0" y1="${TOP + bh + 4}" x2="${W}" y2="${TOP + bh + 4}" stroke="#1d2830" stroke-width="2"/>
          <text x="16" y="${H - 18}" class="wk-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="wk-ksub" text-anchor="end">摆臂扫角=进度</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "工坊", eyebrow: "WORKSHOP", render };
})();
