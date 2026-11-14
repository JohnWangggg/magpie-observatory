/* ----------------------------------------------------------------- gallery
 * Gallery — the long wall: every quota window is a framed painting —
 * the canvas saturates as the window fills (a nearly-full frame
 * gets the red velvet rope); sessions are visitors pausing before
 * the wall on a bench line.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gallery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WALL = 150, FLOOR = 232;

    // frames on the wall — canvas fill = used %, painted as horizontal bands
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const frames = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const c = hot ? "var(--red)" : m.color || "#a78bfa";
      // painting: a few abstract bands whose coverage = used %
      const bands = Math.max(1, Math.round((w.used / 100) * 6));
      const paint = Array.from({ length: bands }, (_, j) =>
        `<rect x="${(x - 16).toFixed(1)}" y="${(WALL - 20 + j * 7).toFixed(1)}" width="${(20 + Math.sin(j * 2 + i) * 8).toFixed(1)}" height="5" rx="2" fill="${c}" opacity="${.75 - j * .07}"/>`
      ).join("");
      return `<g class="ga-frame${hot ? " hot" : ""}">
        <rect x="${(x - 20).toFixed(1)}" y="${WALL - 26}" width="40" height="48" rx="2" fill="var(--card-2)" stroke="var(--line-2)" stroke-width="2.4"/>
        <rect x="${(x - 16).toFixed(1)}" y="${WALL - 22}" width="32" height="40" fill="var(--card-3)"/>
        ${paint}
        <line x1="${(x - 26).toFixed(1)}" y1="${WALL + 30}" x2="${(x + 26).toFixed(1)}" y2="${WALL + 30}" stroke="${hot ? "var(--red)" : "var(--line-2)"}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>
        <circle cx="${(x - 26).toFixed(1)}" cy="${WALL + 30}" r="2" fill="${hot ? "var(--red)" : "var(--line-2)"}"/>
        <circle cx="${(x + 26).toFixed(1)}" cy="${WALL + 30}" r="2" fill="${hot ? "var(--red)" : "var(--line-2)"}"/>
        <text x="${x.toFixed(1)}" y="${WALL + 46}" class="ga-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${WALL + 57}" class="ga-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // visitors — sessions pausing before the wall, drifting slowly
    const visitors = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 70 + i * 84;
      const dur = 5 + (i % 3) * 1.8;
      return `<g class="ga-vis${dead ? " dead" : ""}" style="animation-duration:${dur}s">
        <circle cx="${x}" cy="${FLOOR - 24}" r="4" fill="${dead ? "var(--red)" : m.color || "#a78bfa"}"/>
        <path d="M ${(x - 4).toFixed(1)} ${FLOOR - 19} L ${(x + 4).toFixed(1)} ${FLOOR - 19} L ${(x + 5).toFixed(1)} ${FLOOR - 4} L ${(x - 5).toFixed(1)} ${FLOOR - 4} Z"
          fill="${dead ? "var(--red)" : m.color || "#a78bfa"}" opacity=".85"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;10 0;0 0;-8 0;0 0" dur="${dur}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ga-wrap">
        <div class="ga-head"><b>GALLERY</b><span>画=配额窗 客=会话 色=用量${hotN ? " · " + hotN + " 幅封绳" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${FLOOR}" x2="${W - 30}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="3"/>
          ${frames}${visitors}
          <g class="ga-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="ga-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="43" class="ga-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "美术馆", eyebrow: "GALLERY", render };
})();
