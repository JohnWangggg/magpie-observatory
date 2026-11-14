/* ------------------------------------------------------------------- hotpot
 * Hotpot — the table at dinner: every quota window is a pot on the
 * burner — broth level = headroom left (a dry pot flashes the flame);
 * sessions are ingredients bobbing in the broth; steam rises as
 * requests keep coming.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hotpot";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, POT_Y = 218;

    // pots
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const pots = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const r = 24;
      const flame = Math.max(0.6, 2.2 - (w.used / 100) * 1.6); // hotter pot → faster flame
      return `<g class="hp-pot${hot ? " hot" : ""}">
        <g class="hp-flame" style="animation-duration:${flame.toFixed(2)}s">
          <path d="M ${x.toFixed(1)} ${POT_Y + 22} q -7 -9 0 -16 q 2 5 5 7 q 2 -4 0 -9 q 7 8 0 18 Z" fill="${hot ? "var(--red)" : "var(--amber)"}" opacity=".9"/>
        </g>
        <path d="M ${(x - r).toFixed(1)} ${POT_Y - 26} v 16 a ${r} ${r} 0 0 0 ${r * 2} 0 v -16 Z" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.4"/>
        <path d="M ${(x - r + 3).toFixed(1)} ${POT_Y - 26} h ${(r * 2 - 6).toFixed(1)} l -3 6 h -${(r * 2 - 12).toFixed(1)} Z" fill="${m.color || "#f87171"}" opacity=".55"/>
        <ellipse cx="${x.toFixed(1)}" cy="${POT_Y - 26}" rx="${r}" ry="6" fill="${m.color || "#f87171"}" opacity=".75"/>
        <ellipse cx="${x.toFixed(1)}" cy="${POT_Y - 26}" rx="${r}" ry="6" fill="none" stroke="var(--line-2)" stroke-width="1"/>
        <text x="${x.toFixed(1)}" y="${POT_Y + 40}" class="hp-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${POT_Y + 51}" class="hp-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ingredients — sessions bob on the broth of their provider's pot
    const ingred = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const potIdx = Math.min(i, quotas.length - 1);
      const x = 45 + gap / 2 + potIdx * gap + (i % 2 ? 6 : -6);
      const dur = 2.6 + (i % 3) * 0.9;
      const shape = i % 3;
      const body = shape === 0
        ? `<circle cx="0" cy="0" r="4" fill="${dead ? "var(--red)" : m.color || "#f87171"}"/>`
        : shape === 1
          ? `<rect x="-4" y="-3" width="8" height="6" rx="2" fill="${dead ? "var(--red)" : m.color || "#f87171"}"/>`
          : `<path d="M 0 -5 L 4 4 L -4 4 Z" fill="${dead ? "var(--red)" : m.color || "#f87171"}"/>`;
      return `<g class="hp-item${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 0.5).toFixed(2)}s">
        ${body}
        <animateTransform attributeName="transform" type="translate" values="${x.toFixed(1)} ${POT_Y - 30};${x.toFixed(1)} ${POT_Y - 22}" dur="${dur}s" begin="${(-i * 0.5).toFixed(2)}s" repeatCount="indefinite" additive="replace" calcMode="spline" keySplines=".4 0 .6 1" keyTimes="0;1"/>
      </g>`;
    }).join("");

    // steam
    const steam = [0, 1, 2].map(i =>
      `<path class="hp-steam" style="animation-delay:${(i * 0.7).toFixed(1)}s" d="M ${120 + i * 60} ${POT_Y - 44} q 5 -10 0 -18 q -5 -8 0 -16" fill="none" stroke="var(--fg-2)" stroke-width="1.2" opacity=".4"/>`
    ).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hp-wrap">
        <div class="hp-head"><b>HOTPOT</b><span>锅=配额窗 料=会话 汤=余量${hotN ? " · " + hotN + " 锅烧干" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${POT_Y + 60}" x2="${W - 30}" y2="${POT_Y + 60}" stroke="var(--line-2)" stroke-width="3" opacity=".6"/>
          ${steam}${ingred}${pots}
          <g class="hp-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="hp-k">${fmt(k.tokens)} · ${sessions.length} 料</text>
            <text x="22" y="43" class="hp-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "火锅店", eyebrow: "HOTPOT", render };
})();
