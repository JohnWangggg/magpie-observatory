/* ------------------------------------------------------------------ temple
 * Temple — the shrine approach: every quota window is a torii gate
 * along the stone stair — its hanging lantern burns brighter the
 * hotter the window runs (≥85% the flame gutters); sessions are
 * visitors climbing the steps toward the main hall.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "temple";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, STEPS = 246;

    // torii gates ascending the stair
    const n = Math.max(1, quotas.length);
    const gap = (W - 100) / n;
    const gates = quotas.map((w, i) => {
      const x = 55 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const scale = 1 - i * 0.07; // farther gates slightly smaller
      const gw = 30 * scale, gh = 42 * scale;
      const y = STEPS - i * 14;
      const flick = Math.max(.5, 2 - w.used / 90);
      return `<g class="te-gate${hot ? " hot" : ""}">
        <line x1="${(x - gw / 2).toFixed(1)}" y1="${y}" x2="${(x - gw / 2).toFixed(1)}" y2="${(y - gh).toFixed(1)}" stroke="${hot ? "var(--red)" : m.color || "#f87171"}" stroke-width="3.4"/>
        <line x1="${(x + gw / 2).toFixed(1)}" y1="${y}" x2="${(x + gw / 2).toFixed(1)}" y2="${(y - gh).toFixed(1)}" stroke="${hot ? "var(--red)" : m.color || "#f87171"}" stroke-width="3.4"/>
        <line x1="${(x - gw / 2 - 6).toFixed(1)}" y1="${(y - gh).toFixed(1)}" x2="${(x + gw / 2 + 6).toFixed(1)}" y2="${(y - gh).toFixed(1)}" stroke="${hot ? "var(--red)" : m.color || "#f87171"}" stroke-width="4"/>
        <line x1="${(x - gw / 2 - 2).toFixed(1)}" y1="${(y - gh + 10).toFixed(1)}" x2="${(x + gw / 2 + 2).toFixed(1)}" y2="${(y - gh + 10).toFixed(1)}" stroke="${hot ? "var(--red)" : m.color || "#f87171"}" stroke-width="2"/>
        <g class="te-lamp" style="animation-duration:${flick.toFixed(2)}s">
          <line x1="${x.toFixed(1)}" y1="${(y - gh + 10).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - gh + 18).toFixed(1)}" stroke="var(--line-2)" stroke-width="1"/>
          <circle cx="${x.toFixed(1)}" cy="${(y - gh + 22).toFixed(1)}" r="3.4" fill="${hot ? "var(--red)" : "var(--amber)"}"/>
        </g>
        <text x="${x.toFixed(1)}" y="${y - gh - 8}" class="te-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${y - gh - 17}" class="te-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // steps + visitors
    const stairs = [0,1,2,3,4].map(i =>
      `<line x1="${40 + i * 20}" y1="${STEPS + i * 12}" x2="${W - 40 - i * 20}" y2="${STEPS + i * 12}" stroke="var(--line-2)" stroke-width="${4 - i * .4}" opacity=".8"/>`
    ).join("");

    const visitors = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 16);
      const path = `M ${W - 60} ${STEPS + 56} L ${60 + i * 30} ${STEPS - 30}`;
      return `<g class="te-vis${dead ? " dead" : ""}">
        <circle cx="0" cy="-8" r="3" fill="${dead ? "var(--red)" : m.color || "#f87171"}"/>
        <path d="M -3 -5 L 3 -5 L 4 4 L -4 4 Z" fill="${dead ? "var(--red)" : m.color || "#f87171"}" opacity=".9"/>
        <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(-i * 1.7).toFixed(1)}s" path="${path}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="te-wrap">
        <div class="te-head"><b>TEMPLE</b><span>居=配额窗 客=会话 灯=热度${hotN ? " · " + hotN + " 居灯灭" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <circle cx="${W - 64}" cy="50" r="16" fill="var(--amber)" opacity=".8"/>
          ${stairs}${gates}${visitors}
          <g class="te-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="te-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="43" class="te-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "神社", eyebrow: "TEMPLE", render };
})();
