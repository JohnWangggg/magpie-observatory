/* ------------------------------------------------------------------ harvest
 * Harvest — the wheat field at golden hour: every quota window is a
 * row of wheat — stalks stand taller the more room is left (used %
 * presses them down, ≥85% droops dry); sessions are combine
 * harvesters rolling along the field edge leaving stubble.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harvest";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FIELD = 228;

    // wheat rows — one cluster per window; height = remaining headroom
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const rows = quotas.map((w, i) => {
      const x0 = 45 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const room = 1 - w.used / 100;
      const stalks = [0.16, 0.38, 0.5, 0.62, 0.84].map(fx => {
        const x = x0 + fx * gap * 0.9;
        const hgt = 26 + room * 52 + Math.sin(i * 2 + fx * 9) * 5;
        const lean = hot ? 14 : 4 + fx * 4; // dry stalks lean
        const c = hot ? "var(--red)" : m.color || "#fbbf24";
        return `<g class="hr-stalk" style="animation-delay:${(fx * 1.4).toFixed(2)}s">
          <line x1="${x.toFixed(1)}" y1="${FIELD}" x2="${(x + lean).toFixed(1)}" y2="${FIELD - hgt}" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
          <ellipse cx="${(x + lean).toFixed(1)}" cy="${FIELD - hgt}" rx="3.4" ry="6" fill="${c}" opacity=".8" transform="rotate(${lean} ${(x + lean).toFixed(1)} ${FIELD - hgt})"/>
        </g>`;
      }).join("");
      return `<g class="hr-row${hot ? " hot" : ""}">
        ${stalks}
        <text x="${(x0 + gap / 2).toFixed(1)}" y="${FIELD + 16}" class="hr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x0 + gap / 2).toFixed(1)}" y="${FIELD + 28}" class="hr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // harvesters — sessions rolling along the field edge
    const harvesters = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = FIELD - 6 - i * 16;
      const dur = Math.max(5, 13 - (s.tps || 0) / 16);
      return `<g class="hr-tractor${dead ? " dead" : ""}">
        <rect x="-16" y="-9" width="22" height="11" rx="2" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}"/>
        <rect x="-22" y="-4" width="8" height="8" rx="1.5" fill="var(--card-3)" stroke="${dead ? "var(--red)" : m.color || "#fbbf24"}" stroke-width="1"/>
        <circle cx="-12" cy="4" r="3.4" fill="var(--card-2)" stroke="var(--fg-2)" stroke-width="1"/>
        <circle cx="2" cy="4" r="3.4" fill="var(--card-2)" stroke="var(--fg-2)" stroke-width="1"/>
        <line x1="-22" y1="4" x2="-26" y2="7" stroke="var(--fg-2)" stroke-width="1.6"/>
        <animateTransform attributeName="transform" type="translate" values="30 ${y};${W - 30} ${y}" dur="${dur}s" begin="${(-i * 1.8).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hr-wrap">
        <div class="hr-head"><b>HARVEST</b><span>穗=配额窗 机=会话 高=余量${hotN ? " · " + hotN + " 畦干枯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <circle cx="${W - 66}" cy="56" r="18" fill="var(--amber)" opacity=".9"/>
          <circle cx="${W - 66}" cy="56" r="28" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".22"/>
          <line x1="20" y1="${FIELD}" x2="${W - 20}" y2="${FIELD}" stroke="var(--line-2)" stroke-width="2"/>
          ${rows}${harvesters}
          <g class="hr-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="hr-k">${fmt(k.tokens)} · ${sessions.length} 机</text>
            <text x="22" y="43" class="hr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "麦田", eyebrow: "HARVEST", render };
})();
