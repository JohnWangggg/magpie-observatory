/* ------------------------------------------------------------------ kitchen
 * Kitchen — a brigade line: every quota window is a burner
 * with a pot; steam and bubble intensity = used% (≥85% the
 * flame flares amber); sessions are chefs (toque + apron)
 * shuttling plates between stations.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kitchen";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 46, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    const stations = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e08040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const potY = TOP + bh - 30;
      const flameH = 6 + f * 14;
      const bubbles = Math.round(f * 4);
      const bubbleEls = Array.from({ length: bubbles }, (_, bi) => {
        const bx = x - 8 + bi * 4;
        const dur = (1.4 + bi * 0.3).toFixed(1);
        return `<circle cx="${bx}" cy="${potY - 12}" r="${1.5 + f * 2}" fill="${col}" opacity=".5">
          <animate attributeName="cy" values="${potY - 12};${potY - 26};${potY - 12}" dur="${dur}s" begin="${(-bi * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".5;.1;.5" dur="${dur}s" begin="${(-bi * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }).join("");
      return `<g class="ki-station${hot ? " hot" : ""}">
        <!-- counter -->
        <rect x="${x - bw / 2 + 6}" y="${potY - 4}" width="${bw - 12}" height="34" rx="2" fill="#1a2128" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- pot -->
        <rect x="${x - 12}" y="${potY - 16}" width="24" height="16" rx="3" fill="#2a3038"/>
        <rect x="${x - 14}" y="${potY - 18}" width="28" height="3" rx="1.5" fill="#384048"/>
        <ellipse cx="${x}" cy="${potY - 16}" rx="10" ry="2" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>
        ${bubbleEls}
        <!-- flame -->
        <path d="M${x - 5} ${potY + 14} Q ${x - 8} ${potY + 14 - flameH * .5} ${x} ${potY + 14 - flameH} Q ${x + 4} ${potY + 14 - flameH * .4} ${x + 5} ${potY + 14} Z"
          fill="${hot ? "var(--amber)" : col}" opacity=".9">
          <animate attributeName="d" values="M${x - 5} ${potY + 14} Q ${x - 8} ${potY + 14 - flameH * .5} ${x} ${potY + 14 - flameH} Q ${x + 4} ${potY + 14 - flameH * .4} ${x + 5} ${potY + 14} Z;M${x - 5} ${potY + 14} Q ${x - 6} ${potY + 14 - flameH * .7} ${x + 1} ${potY + 14 - flameH * 1.15} Q ${x + 5} ${potY + 14 - flameH * .3} ${x + 5} ${potY + 14} Z;M${x - 5} ${potY + 14} Q ${x - 8} ${potY + 14 - flameH * .5} ${x} ${potY + 14 - flameH} Q ${x + 4} ${potY + 14 - flameH * .4} ${x + 5} ${potY + 14} Z" dur="${(1 + f).toFixed(1)}s" repeatCount="indefinite"/></path>
        <!-- hood -->
        <path d="M${x - 14} ${TOP - 4} L${x + 14} ${TOP - 4} L${x + 8} ${TOP - 16} L${x - 8} ${TOP - 16} Z" fill="#2a3038"/>
        <text x="${x}" y="${potY + 26}" class="ki-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${potY + 34}" class="ki-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // chefs
    const chefs = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0f0e0");
      const dur = Math.max(10, 20 - (s.tps || 0) / 10);
      const y = TOP + bh - 8 - (i % 2) * 4;
      return `<g class="ki-chef${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <rect x="-3" y="-14" width="6" height="4" rx="1.5" fill="#f0f0e0"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ki-wrap">
        <div class="ki-head"><b>KITCHEN</b><span>灶台=配额窗 汽泡=用量 火焰=过热 厨师=会话${hotN ? " · " + hotN + " 爆炒" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${stations}${chefs}
          <text x="16" y="${H - 18}" class="ki-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ki-ksub" text-anchor="end">高帽=厨师</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "厨房", eyebrow: "KITCHEN", render };
})();
