/* ------------------------------------------------------------------- winery
 * Winery — the cellar: each provider window is an oak cask, its
 * fill-line is the used %, sessions are the grape drips feeding in
 * through the bung. A cask over 85% glows amber-red and its drip
 * turns dark.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "winery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 252;
    const n = Math.max(1, quotas.length);
    const slot = (W - 40) / n;
    const caskW = Math.min(56, slot - 8);

    const casks = quotas.map((w, i) => {
      const x = 20 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = Math.min(100, w.used) / 100;
      const h = 96, y0 = FLOOR - h;
      const fillH = fill * (h - 16);
      return `<g class="wn-cask${hot ? " hot" : ""}" style="--pc:${m.color || "#8b5cf6"}">
        <ellipse cx="${x.toFixed(1)}" cy="${y0.toFixed(1)}" rx="${(caskW / 2).toFixed(1)}" ry="7" fill="var(--card-3)" stroke="var(--line-2)"/>
        <rect x="${(x - caskW / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${caskW.toFixed(1)}" height="${h}" fill="var(--card-2)" stroke="var(--line-2)"/>
        <rect x="${(x - caskW / 2 + 4).toFixed(1)}" y="${(y0 + 10).toFixed(1)}" width="${(caskW - 8).toFixed(1)}" height="${(h - 20).toFixed(1)}" rx="3"
          fill="color-mix(in srgb, ${m.color || "#8b5cf6"} ${Math.round(fill * 90 + 10)}%, var(--card))" opacity=".9"/>
        <line x1="${(x - caskW / 2).toFixed(1)}" y1="${(y0 + h / 3).toFixed(1)}" x2="${(x + caskW / 2).toFixed(1)}" y2="${(y0 + h / 3).toFixed(1)}" stroke="var(--line-2)" stroke-width="2"/>
        <line x1="${(x - caskW / 2).toFixed(1)}" y1="${(y0 + h * 2 / 3).toFixed(1)}" x2="${(x + caskW / 2).toFixed(1)}" y2="${(y0 + h * 2 / 3).toFixed(1)}" stroke="var(--line-2)" stroke-width="2"/>
        <ellipse cx="${x.toFixed(1)}" cy="${(y0 + h).toFixed(1)}" rx="${(caskW / 2).toFixed(1)}" ry="7" fill="var(--card-3)" stroke="var(--line-2)"/>
        <text x="${x.toFixed(1)}" y="${(y0 + h / 2).toFixed(1)}" class="wn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${FLOOR + 18}" class="wn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
        <text x="${x.toFixed(1)}" y="${FLOOR + 30}" class="wn-sub" text-anchor="middle">${esc(w.name.slice(0, 8))}</text>
      </g>`;
    }).join("");

    // drips from the ceiling — one per session
    const drips = sessions.map((s, i) => {
      const x = 44 + i * ((W - 88) / Math.max(1, sessions.length - 1));
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      return `<g class="wn-drip${dead ? " dead" : ""}" style="animation-delay:${(i * 0.5).toFixed(2)}s;animation-duration:${(2.2 + (i % 3) * 0.6).toFixed(1)}s">
        <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="46" stroke="var(--line-2)" stroke-width="1.2" stroke-dasharray="2 3"/>
        <circle cx="${x.toFixed(1)}" cy="0" r="3" fill="${dead ? "var(--red)" : m.color || "#8b5cf6"}">
          <animate attributeName="cy" values="0;${FLOOR - 96}" dur="${(2.2 + (i % 3) * 0.6).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wn-wrap">
        <div class="wn-head"><b>WINERY</b><span>桶=配额窗 滴=会话 液=用量${hotN ? " · " + hotN + " 桶将溢" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${casks}${drips}
          <g class="wn-card">
            <rect x="${W - 134}" y="14" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 124}" y="32" class="wn-k">${fmt(k.tokens)} · ${sessions.length} 滴</text>
            <text x="${W - 124}" y="45" class="wn-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酒庄", eyebrow: "WINERY", render };
})();
