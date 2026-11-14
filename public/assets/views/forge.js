/* -------------------------------------------------------------------- forge
 * Forge — the smithy: every quota window is a furnace — the coals
 * glow from ember to white-hot as the window fills; sessions are
 * workpieces on the anvil, sparks flying each strike.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "forge";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 236;

    // furnaces
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const furnaces = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      // glow colour: deep ember → bright orange → white-hot
      const g = hot ? "#fff1d6" : w.used >= 50 ? "var(--amber)" : "#d95d39";
      const glow = 4 + (w.used / 100) * 14;
      const flick = Math.max(.5, 2 - w.used / 80);
      return `<g class="fg-furn${hot ? " hot" : ""}">
        <rect x="${(x - 16).toFixed(1)}" y="${FLOOR - 34}" width="32" height="34" rx="3" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.2"/>
        <rect x="${(x - 10).toFixed(1)}" y="${FLOOR - 28}" width="20" height="16" rx="2" fill="${g}" class="fg-coal" style="animation-duration:${flick.toFixed(2)}s;filter:drop-shadow(0 0 ${glow.toFixed(0)}px ${g})"/>
        <path d="M ${(x - 16).toFixed(1)} ${FLOOR - 34} h 32" stroke="var(--line-2)" stroke-width="2"/>
        <text x="${x.toFixed(1)}" y="${FLOOR + 14}" class="fg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${FLOOR + 25}" class="fg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // anvils + workpieces — sessions being struck
    const anvils = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 90 + i * 74;
      const dur = 1.6 + (i % 3) * .5;
      const sparks = [0, 1, 2].map(j =>
        `<line class="fg-spark" style="animation-delay:${(j * 0.25 + i * 0.4).toFixed(2)}s" x1="${x}" y1="146" x2="${x + (j - 1) * 10}" y2="128" stroke="var(--amber)" stroke-width="1.4" stroke-linecap="round"/>`
      ).join("");
      return `<g class="fg-anvil${dead ? " dead" : ""}">
        <rect x="${x - 12}" y="148" width="24" height="6" rx="2" fill="var(--fg-2)" opacity=".9"/>
        <line x1="${x - 4}" y1="154" x2="${x - 4}" y2="168" stroke="var(--fg-2)" stroke-width="3"/>
        <rect x="${x - 9}" y="142" width="18" height="5" rx="2" fill="${dead ? "var(--red)" : m.color || "#f87171"}"/>
        <g class="fg-hammer" style="animation-duration:${dur}s">
          <line x1="${x}" y1="122" x2="${x}" y2="140" stroke="var(--fg-2)" stroke-width="2.4"/>
          <rect x="${x - 7}" y="114" width="14" height="9" rx="2" fill="var(--card-3)" stroke="var(--fg-2)" stroke-width="1"/>
        </g>
        ${sparks}
        <text x="${x}" y="178" class="fg-tok" text-anchor="middle">${esc((s.title || s.agent || "").slice(0, 8))}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fg-wrap">
        <div class="fg-head"><b>FORGE</b><span>炉=配额窗 件=会话 火=热度${hotN ? " · " + hotN + " 炉白热" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="20" y1="${FLOOR}" x2="${W - 20}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="2"/>
          ${anvils}${furnaces}
          <g class="fg-card">
            <rect x="${W - 138}" y="12" width="124" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="30" class="fg-k">${fmt(k.tokens)} · ${sessions.length} 件</text>
            <text x="${W - 130}" y="43" class="fg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铁匠铺", eyebrow: "FORGE", render };
})();
