/* ------------------------------------------------------------------ bonfire
 * Bonfire — a night campsite: a ring of stone logs, each log
 * = one quota window glowing at used% (≥85% the ember flares);
 * the central fire = average usage; sessions are sparks and
 * embers drifting off the fire and orbiting the stones.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bonfire";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 8);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, cx = W / 2, cy = H / 2 + 6, TOP = 34, BOT = 38;
    const ring = Math.min(W, H - TOP - BOT) / 2 - 20;
    const avg = quotas.length ? quotas.reduce((s, w) => s + w.used, 0) / quotas.length : 0;

    // stone logs around the fire
    const logs = quotas.map((w, i) => {
      const a = (i / quotas.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * ring;
      const y = cy + Math.sin(a) * ring;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#f0a050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      // a log = rect angled radially; inner glow = ember tip toward fire
      const len = 26, wid = 8;
      const tipX = x + Math.cos(a + Math.PI) * (len / 2 - 4);
      const tipY = y + Math.sin(a + Math.PI) * (len / 2 - 4);
      return `<g class="bo-log${hot ? " hot" : ""}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">
        <rect x="${(x - wid / 2).toFixed(1)}" y="${(y - len / 2).toFixed(1)}" width="${wid}" height="${len}" rx="3"
          fill="#2a2018" stroke="${hot ? "var(--amber)" : "#3a3028"}" stroke-width="${hot ? 1.2 : .8}"/>
        <ellipse cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" rx="4" ry="6" fill="${col}" opacity="${(0.3 + f * 0.7).toFixed(2)}">
          ${hot ? `<animate attributeName="opacity" values="${(0.3 + f * 0.7).toFixed(2)};.3;${(0.3 + f * 0.7).toFixed(2)}" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </ellipse>
        <text x="${x.toFixed(1)}" y="${(y + len / 2 + 10).toFixed(1)}" class="bo-num" text-anchor="middle" transform="rotate(${(-(a * 180 / Math.PI + 90)).toFixed(1)} ${x.toFixed(1)} ${(y + len / 2 + 10).toFixed(1)})">${Math.round(w.used)}</text>
      </g>`;
    }).join("");

    // central fire — three tongues; height tracks avg
    const fireH = 18 + avg / 3;
    const fire = `<g class="bo-fire">
      <ellipse cx="${cx}" cy="${cy + 14}" rx="30" ry="7" fill="#181008"/>
      <path d="M${cx - 18} ${cy + 14} Q ${cx - 24} ${cy - fireH * .5} ${cx - 6} ${cy - fireH} Q ${cx - 2} ${cy - fireH * .6} ${cx} ${cy + 14}Z" fill="#e04020" opacity=".9">
        <animate attributeName="d" values="M${cx - 18} ${cy + 14} Q ${cx - 24} ${cy - fireH * .5} ${cx - 6} ${cy - fireH} Q ${cx - 2} ${cy - fireH * .6} ${cx} ${cy + 14}Z;M${cx - 18} ${cy + 14} Q ${cx - 20} ${cy - fireH * .7} ${cx - 4} ${cy - fireH * 1.15} Q ${cx} ${cy - fireH * .5} ${cx} ${cy + 14}Z;M${cx - 18} ${cy + 14} Q ${cx - 24} ${cy - fireH * .5} ${cx - 6} ${cy - fireH} Q ${cx - 2} ${cy - fireH * .6} ${cx} ${cy + 14}Z" dur="1.6s" repeatCount="indefinite"/></path>
      <path d="M${cx - 8} ${cy + 14} Q ${cx - 12} ${cy - fireH * .4} ${cx + 2} ${cy - fireH * .8} Q ${cx + 8} ${cy - fireH * .4} ${cx + 10} ${cy + 14}Z" fill="#f09030" opacity=".95">
        <animate attributeName="d" values="M${cx - 8} ${cy + 14} Q ${cx - 12} ${cy - fireH * .4} ${cx + 2} ${cy - fireH * .8} Q ${cx + 8} ${cy - fireH * .4} ${cx + 10} ${cy + 14}Z;M${cx - 8} ${cy + 14} Q ${cx - 8} ${cy - fireH * .55} ${cx + 4} ${cy - fireH * .95} Q ${cx + 10} ${cy - fireH * .3} ${cx + 10} ${cy + 14}Z;M${cx - 8} ${cy + 14} Q ${cx - 12} ${cy - fireH * .4} ${cx + 2} ${cy - fireH * .8} Q ${cx + 8} ${cy - fireH * .4} ${cx + 10} ${cy + 14}Z" dur="1.3s" begin="-.4s" repeatCount="indefinite"/></path>
      <path d="M${cx - 2} ${cy + 14} Q ${cx - 4} ${cy - fireH * .3} ${cx + 6} ${cy - fireH * .55} Q ${cx + 10} ${cy - fireH * .2} ${cx + 4} ${cy + 14}Z" fill="#f8e090" opacity=".9">
        <animate attributeName="d" values="M${cx - 2} ${cy + 14} Q ${cx - 4} ${cy - fireH * .3} ${cx + 6} ${cy - fireH * .55} Q ${cx + 10} ${cy - fireH * .2} ${cx + 4} ${cy + 14}Z;M${cx - 2} ${cy + 14} Q ${cx} ${cy - fireH * .45} ${cx + 8} ${cy - fireH * .7} Q ${cx + 12} ${cy - fireH * .15} ${cx + 4} ${cy + 14}Z;M${cx - 2} ${cy + 14} Q ${cx - 4} ${cy - fireH * .3} ${cx + 6} ${cy - fireH * .55} Q ${cx + 10} ${cy - fireH * .2} ${cx + 4} ${cy + 14}Z" dur="1.1s" begin="-.2s" repeatCount="indefinite"/></path>
      <text x="${cx}" y="${cy + 34}" class="bo-avg" text-anchor="middle">avg ${Math.round(avg)}%</text>
    </g>`;

    // sparks — sessions drifting off the fire
    const sparks = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f8e090");
      const a = (i / sessions.length) * Math.PI * 2;
      const endX = cx + Math.cos(a) * (ring * 1.4);
      const endY = cy + Math.sin(a) * (ring * 1.4);
      const dur = Math.max(6, 14 - (s.tps || 0) / 10);
      return `<g class="bo-spark">
        <animateMotion path="M${cx} ${cy - fireH * .6} Q ${cx + (endX - cx) * .5} ${cy - fireH} ${endX.toFixed(1)} ${endY.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle r="2.5" fill="${col}">
          <animate attributeName="r" values="2.5;1;0" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".95;.5;0" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bo-wrap">
        <div class="bo-head"><b>BONFIRE</b><span>木石=配额窗 炭头=用量 中央火=平均 火星=会话${hotN ? " · " + hotN + " 炽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0d0a06" rx="10"/>
          ${logs}${fire}${sparks}
          <text x="16" y="${H - 18}" class="bo-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="bo-ksub" text-anchor="end">三焰=心跳</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "篝火", eyebrow: "BONFIRE", render };
})();
