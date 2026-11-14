/* ------------------------------------------------------------------ campfire
 * Campfire — the evening circle: each agent is a small ring of stones,
 * its session is a flame fed by the try count (height = tokens,
 * colour = agent); quota windows are log piles stacked at the edge —
 * pile height = remaining %, so hot windows shrink to embers.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "campfire";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GRND = 252;
    const n = Math.max(1, sessions.length);
    const slot = (W - 60) / n;

    const fires = sessions.map((s, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const h = 24 + Math.min(34, (s.tokens || 0) / 5e5);
      const sparks = s.tps && s.tps > 20 ? `<circle class="cf-spark" cx="${x - 4}" cy="${GRND - h - 14}" r="2" fill="${m.color || "#fbbf24"}"><animate attributeName="cy" values="${GRND - h - 14};${GRND - h - 44}" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="cf-fire${dead ? " dead" : ""}">
        <ellipse cx="${x.toFixed(1)}" cy="${GRND}" rx="18" ry="6" fill="var(--card-3)" stroke="var(--line-2)"/>
        <ellipse cx="${x - 12}" cy="${GRND - 2}" rx="4" ry="3" fill="var(--line-2)"/>
        <ellipse cx="${x + 12}" cy="${GRND - 2}" rx="4" ry="3" fill="var(--line-2)"/>
        <ellipse cx="${x - 4}" cy="${GRND + 3}" rx="4" ry="3" fill="var(--line-2)"/>
        <ellipse cx="${x + 4}" cy="${GRND + 3}" rx="4" ry="3" fill="var(--line-2)"/>
        <path class="cf-flame" style="animation-duration:${(1.6 + (i % 3) * 0.4).toFixed(1)}s"
          d="M ${x.toFixed(1)} ${GRND} Q ${(x - 8).toFixed(1)} ${(GRND - h * 0.5).toFixed(1)} ${x.toFixed(1)} ${(GRND - h).toFixed(1)} Q ${(x + 8).toFixed(1)} ${(GRND - h * 0.5).toFixed(1)} ${x.toFixed(1)} ${GRND} Z"
          fill="${dead ? "var(--red)" : m.color || "#fbbf24"}" opacity="${dead ? .4 : .9}"/>
        <path d="M ${x.toFixed(1)} ${GRND} Q ${(x - 4).toFixed(1)} ${(GRND - h * 0.3).toFixed(1)} ${x.toFixed(1)} ${(GRND - h * 0.55).toFixed(1)} Q ${(x + 4).toFixed(1)} ${(GRND - h * 0.3).toFixed(1)} ${x.toFixed(1)} ${GRND} Z"
          fill="var(--card-3)" opacity=".7"/>
        ${sparks}
        <text x="${x.toFixed(1)}" y="${GRND + 22}" class="cf-name" text-anchor="middle">${esc((m.name || s.agent).slice(0, 6))}</text>
        <text x="${x.toFixed(1)}" y="${GRND + 34}" class="cf-sub" text-anchor="middle">${s.tps ? s.tps.toFixed(0) + " t/s" : "—"}</text>
      </g>`;
    }).join("");

    // log piles — each quota window is a stack; height shrinks as used grows
    const piles = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const x = 34 + i * ((W - 68) / Math.max(1, quotas.length - 1));
      const rem = Math.max(0, 100 - w.used);
      const h = 8 + (rem / 100) * 34;
      const hot = w.used >= 85;
      return `<g class="cf-pile${hot ? " hot" : ""}">
        <rect x="${x - 16}" y="${GRND - 70 - h}" width="32" height="${h}" rx="3" fill="${hot ? "var(--red)" : m.color || "#a07850"}" opacity="${hot ? .85 : .6}"/>
        <line x1="${x - 14}" y1="${GRND - 70 - h / 2}" x2="${x + 14}" y2="${GRND - 70 - h / 2}" stroke="var(--bg)" stroke-width="1" opacity=".4"/>
        <line x1="${x - 14}" y1="${GRND - 70 - h * 0.75}" x2="${x + 14}" y2="${GRND - 70 - h * 0.75}" stroke="var(--bg)" stroke-width="1" opacity=".4"/>
        <text x="${x.toFixed(1)}" y="${GRND - 76 - h}" class="cf-pct" text-anchor="middle">${Math.round(rem)}%</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cf-wrap">
        <div class="cf-head"><b>CAMPFIRE</b><span>火=会话 石=agent 柴=配额余${hotN ? " · " + hotN + " 柴尽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${GRND}" x2="${W}" y2="${GRND}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${piles}${fires}
          <g class="cf-card">
            <rect x="${W - 134}" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 124}" y="30" class="cf-k">${fmt(k.tokens)} · ${sessions.length} 火</text>
            <text x="${W - 124}" y="43" class="cf-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "篝火", eyebrow: "CAMPFIRE", render };
})();
