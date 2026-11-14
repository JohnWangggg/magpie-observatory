/* ------------------------------------------------------------------- aviary
 * Aviary — a perch for every agent: nests sit on branches across the
 * sky, sessions are eggs inside (colour = provider), quota windows are
 * the fruit hanging off the canopy. Hot quota = fruit ready to fall.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "aviary";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    // group sessions by agent so each agent owns a nest
    const byAgent = new Map();
    sessions.forEach(s => byAgent.set(s.agent, (byAgent.get(s.agent) || []).concat(s)));

    const W = 400, H = 300;
    const agents = [...byAgent.keys()].slice(0, 6);
    const rowY = (i) => 92 + i * 42;
    const branch = `<path d="M 0 118 Q 200 100 ${W} 112" stroke="var(--line-2)" stroke-width="2.5" fill="none" opacity=".7"/>
                    <path d="M 0 200 Q 200 188 ${W} 196" stroke="var(--line-2)" stroke-width="2.5" fill="none" opacity=".7"/>
                    <path d="M 0 282 Q 200 268 ${W} 278" stroke="var(--line-2)" stroke-width="2.5" fill="none" opacity=".7"/>`;

    const nests = agents.map((ag, i) => {
      const m = metaOf(ameta, ag);
      const list = byAgent.get(ag);
      const y = rowY(i);
      const x = 60 + (i % 3) * 120;
      const eggs = list.slice(0, 4).map((s, j) => {
        const pm = metaOf(pmeta, s.provider);
        const dead = s.status === "err";
        return `<ellipse class="av-egg${dead ? " dead" : ""}" cx="${(x - 12 + j * 8).toFixed(1)}" cy="${y + 4}" rx="3.2" ry="4.4"
          fill="${dead ? "var(--red)" : pm.color || "#fbbf24"}" opacity="${dead ? .4 : .95}"/>`;
      }).join("");
      return `<g class="av-nest">
        <ellipse cx="${x}" cy="${y + 6}" rx="20" ry="7" fill="none" stroke="${m.color || "#8b7cf6"}" stroke-width="1.6"/>
        <path d="M ${x - 20} ${y + 6} Q ${x} ${y + 16} ${x + 20} ${y + 6}" fill="none" stroke="${m.color || "#8b7cf6"}" stroke-width="1.6"/>
        ${eggs}
        <text x="${x - 38}" y="${y + 4}" class="av-name">${esc((m.name || ag).slice(0, 6))}</text>
        <text x="${x - 38}" y="${y + 14}" class="av-cnt">${list.length} 蛋</text>
      </g>`;
    }).join("");

    // canopy fruit — one per quota window; size & colour heat with used%
    const fruit = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const x = 40 + i * ((W - 80) / Math.max(1, quotas.length - 1));
      const y = 30 + (i % 2) * 18;
      const r = 4 + (w.used / 100) * 6;
      const hot = w.used >= 85;
      return `<g class="av-fruit${hot ? " hot" : ""}" style="animation-delay:${(i * 0.3).toFixed(2)}s">
        <line x1="${x}" y1="${y - r - 6}" x2="${x}" y2="${y - r}" stroke="var(--line-2)" stroke-width="1"/>
        <circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${hot ? "var(--red)" : m.color || "#4ade80"}" opacity=".9"/>
        <text x="${x}" y="${y + r + 10}" class="av-pct" text-anchor="middle">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="av-wrap">
        <div class="av-head"><b>AVIARY</b><span>巢=agent 蛋=会话 果=配额${hotN ? " · " + hotN + " 果将落" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          ${branch}${fruit}${nests}
          <g class="av-card">
            <rect x="${W - 130}" y="14" width="116" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 120}" y="30" class="av-k">${fmt(k.tokens)} · ${sessions.length} 只</text>
            <text x="${W - 120}" y="43" class="av-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鸟舍", eyebrow: "AVIARY", render };
})();
