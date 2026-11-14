/* ------------------------------------------------------------------- circus
 * Circus — the big-top ring: a tightrope walker for every session
 * (balance bar length = tokens, colour = agent); the quota windows
 * are juggling pins suspended above the ring — the fuller they are,
 * the lower they hang.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "circus";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, RING = 236;
    const n = Math.max(1, sessions.length);
    const slot = (W - 80) / n;

    // tightrope + walkers
    const ropes = sessions.map((s, i) => {
      const y = RING - 70 - (i % 2) * 14;
      return `<line class="cc-rope" x1="30" y1="${y}" x2="${W - 30}" y2="${y}" stroke="var(--line-2)" stroke-width="1.2" stroke-dasharray="4 3" opacity=".6"/>`;
    }).join("");

    const walkers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const pm = metaOf(pmeta, s.provider);
      const dead = s.status === "err";
      const y = RING - 70 - (i % 2) * 14;
      const bal = 12 + Math.min(12, (s.tokens || 0) / 6e5);
      const dur = 5 + (i % 3) * 1.6;
      return `<g class="cc-walk${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 0.9).toFixed(1)}s">
        <circle cx="0" cy="${y - 14}" r="4" fill="${dead ? "var(--red)" : m.color || "#f472b6"}"/>
        <line x1="0" y1="${y - 10}" x2="0" y2="${y}" stroke="${dead ? "var(--red)" : m.color || "#f472b6"}" stroke-width="2" stroke-linecap="round"/>
        <line x1="${-bal}" y1="${y - 10}" x2="${bal}" y2="${y - 10}" stroke="${pm.color || "#f472b6"}" stroke-width="1.6" opacity=".8"/>
        <animateTransform attributeName="transform" type="translate" values="30 0;${W - 30} 0" dur="${dur}s" begin="${(-i * 0.9).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    // juggling pins — quota windows dangling from the big top
    const pins = quotas.map((w, i) => {
      const x = 40 + i * ((W - 80) / Math.max(1, quotas.length - 1));
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const drop = 20 + (w.used / 100) * 40; // hangs lower as it fills
      return `<g class="cc-pin${hot ? " hot" : ""}" style="animation-delay:${(i * 0.3).toFixed(2)}s">
        <line x1="${x.toFixed(1)}" y1="10" x2="${x.toFixed(1)}" y2="${10 + drop}" stroke="var(--line-2)" stroke-width="1"/>
        <ellipse cx="${x.toFixed(1)}" cy="${10 + drop + 10}" rx="5" ry="10" fill="${hot ? "var(--red)" : m.color || "#f472b6"}" opacity=".9"/>
        <circle cx="${x.toFixed(1)}" cy="${10 + drop - 6}" r="2.4" fill="var(--card-3)" stroke="var(--line-2)" stroke-width=".8"/>
        <text x="${x + 12}" y="${10 + drop + 6}" class="cc-pct">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cc-wrap">
        <div class="cc-head"><b>CIRCUS</b><span>索=会话 杆=token 球=配额${hotN ? " · " + hotN + " 球垂地" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <path d="M 20 ${RING} Q 200 ${RING - 30} 380 ${RING}" stroke="var(--line-2)" stroke-width="1.4" fill="none"/>
          <ellipse cx="200" cy="${RING}" rx="90" ry="10" fill="none" stroke="var(--line-2)" stroke-width="1.4" opacity=".6"/>
          ${pins}${ropes}${walkers}
          <g class="cc-card">
            <rect x="${W - 140}" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="30" class="cc-k">${fmt(k.tokens)} · ${sessions.length} 索</text>
            <text x="${W - 130}" y="43" class="cc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "马戏团", eyebrow: "CIRCUS", render };
})();
