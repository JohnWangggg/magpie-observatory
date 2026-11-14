/* ------------------------------------------------------------------- hangar
 * Hangar — a spaceport apron: every quota window is a parked
 * shuttle on a pad (exhaust flame height = used%, ≥85% the
 * engine glows amber); sessions are ground crew (a helmet dot
 * + suit) towing between pads.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hangar";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 42, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    const pads = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60a0c0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const padY = TOP + bh - 26;
      const flameH = 4 + f * 22;
      const shutH = 34;
      const shipY = padY - shutH;
      return `<g class="hk-pad${hot ? " hot" : ""}">
        <!-- pad -->
        <ellipse cx="${x}" cy="${padY + 8}" rx="${bw / 2 - 8}" ry="6" fill="#1a2128" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- shuttle -->
        <g>
          <path d="M${x - 10} ${shipY + 12} L${x - 12} ${shipY + 4} L${x - 10} ${shipY} L${x + 10} ${shipY} L${x + 12} ${shipY + 4} L${x + 10} ${shipY + 12} Z" fill="#2a3038"/>
          <rect x="${x - 8}" y="${shipY + 12}" width="16" height="${shutH - 12}" rx="4" fill="#2a3038"/>
          <rect x="${x - 6}" y="${shipY + 16}" width="12" height="6" rx="2" fill="${col}" opacity=".7"/>
          <path d="M${x - 10} ${shipY + 20} L${x - 14} ${shipY + 30} L${x - 10} ${shipY + 30} Z" fill="#384048"/>
          <path d="M${x + 10} ${shipY + 20} L${x + 14} ${shipY + 30} L${x + 10} ${shipY + 30} Z" fill="#384048"/>
          <!-- exhaust -->
          <path d="M${x - 5} ${padY} Q ${x - 8} ${padY + flameH * .4} ${x} ${padY + flameH} Q ${x + 4} ${padY + flameH * .3} ${x + 5} ${padY} Z"
            fill="${hot ? "var(--amber)" : col}" opacity=".85">
            <animate attributeName="d" values="M${x - 5} ${padY} Q ${x - 8} ${padY + flameH * .4} ${x} ${padY + flameH} Q ${x + 4} ${padY + flameH * .3} ${x + 5} ${padY} Z;M${x - 5} ${padY} Q ${x - 6} ${padY + flameH * .6} ${x + 1} ${padY + flameH * 1.2} Q ${x + 5} ${padY + flameH * .25} ${x + 5} ${padY} Z;M${x - 5} ${padY} Q ${x - 8} ${padY + flameH * .4} ${x} ${padY + flameH} Q ${x + 4} ${padY + flameH * .3} ${x + 5} ${padY} Z" dur="${(1 + f).toFixed(1)}s" repeatCount="indefinite"/></path>
        </g>
        <text x="${x}" y="${padY + 20}" class="hk-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${padY + 28}" class="hk-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // crew — helmet + suit
    const crew = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0d0a0");
      const dur = Math.max(11, 22 - (s.tps || 0) / 10);
      const y = TOP + bh - 6 - (i % 2) * 3;
      return `<g class="hk-crew${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-14} ${y.toFixed(1)};${W + 14} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3.5" fill="#f0f0e0"/>
        <circle cx="0" cy="-8" r="2" fill="${col}"/>
        <rect x="-4" y="-4" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hk-wrap">
        <div class="hk-head"><b>HANGAR</b><span>停机位=配额窗 尾焰=用量 地勤=会话${hotN ? " · " + hotN + " 预热" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#101418" rx="10"/>
          ${pads}${crew}
          <text x="16" y="${H - 18}" class="hk-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="hk-ksub" text-anchor="end">椭圆=位</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "机库", eyebrow: "HANGAR", render };
})();
