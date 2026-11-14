/* ------------------------------------------------------------------ aquarium
 * Aquarium — a tank: each agent owns a bubble column on the left,
 * sessions swim as fish (colour = agent, size = tokens); the quota
 * windows are warning stripes drawn across the water — the higher
 * the stripe's water level, the fuller that window.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "aquarium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 8);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SURF = 54, FLOOR = 268;

    // water-level warning stripes — one per quota window across the right 2/3
    const stripes = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const y = SURF + 14 + i * 34;
      const lvl = Math.min(1, w.used / 100);
      const hot = w.used >= 85;
      return `<g class="aq-stripe${hot ? " hot" : ""}">
        <line x1="130" y1="${y.toFixed(1)}" x2="390" y2="${y.toFixed(1)}" stroke="${hot ? "var(--red)" : m.color || "#56d4dd"}" stroke-width="1.4" stroke-dasharray="5 4" opacity=".7"/>
        <rect x="130" y="${(y - lvl * 22).toFixed(1)}" width="260" height="${(lvl * 22).toFixed(1)}" fill="${hot ? "var(--red)" : m.color || "#56d4dd"}" opacity=".08"/>
        <text x="134" y="${(y - 4).toFixed(1)}" class="aq-lab">${esc((m.name || w.prov).slice(0, 5))}</text>
        <text x="386" y="${(y - 4).toFixed(1)}" class="aq-pct" text-anchor="end">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // bubble columns — one per agent
    const byAgent = new Map();
    sessions.forEach(s => byAgent.set(s.agent, (byAgent.get(s.agent) || []).concat(s)));
    const agents = [...byAgent.keys()].slice(0, 5);
    const cols = agents.map((ag, i) => {
      const x = 24 + i * 22;
      const m = metaOf(ameta, ag);
      const n2 = Math.min(5, byAgent.get(ag).length);
      const bubbles = Array.from({ length: n2 }, (_, j) =>
        `<circle class="aq-bub" cx="${x}" cy="0" r="${2 + (j % 3)}" fill="${m.color || "#56d4dd"}" opacity=".8"
          style="animation-delay:${(j * 0.7 + i * 0.3).toFixed(1)}s;animation-duration:${(2.2 + (j % 2) * 0.8).toFixed(1)}s"/>`).join("");
      return `<g>${bubbles}
        <text x="${x - 7}" y="${FLOOR + 14}" class="aq-aname">${esc((m.name || ag).slice(0, 4))}</text>
      </g>`;
    }).join("");

    // fish — sessions swimming left-right across the tank
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = SURF + 30 + (i % 4) * 40;
      const sz = 5 + Math.min(7, (s.tokens || 0) / 7e5);
      const dur = 7 + (i % 4) * 1.6;
      return `<g class="aq-fish${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 1.2).toFixed(1)}s">
        <ellipse cx="0" cy="0" rx="${sz * 1.4}" ry="${sz * 0.8}" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}" opacity="${dead ? .4 : .9}"/>
        <path d="M ${(-sz * 1.4).toFixed(1)} 0 L ${(-sz * 2.4).toFixed(1)} ${(-sz * 0.7).toFixed(1)} L ${(-sz * 2.4).toFixed(1)} ${(sz * 0.7).toFixed(1)} Z" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}" opacity="${dead ? .4 : .9}"/>
        <circle cx="${(sz * 0.8).toFixed(1)}" cy="${(-sz * 0.2).toFixed(1)}" r="${sz * 0.16}" fill="var(--bg)"/>
        <animateTransform attributeName="transform" type="translate" values="420 ${y};-40 ${y}" dur="${dur}s" begin="${(-i * 1.2).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="aq-wrap">
        <div class="aq-head"><b>AQUARIUM</b><span>泡=agent 鱼=会话 水线=配额${hotN ? " · " + hotN + " 缸报警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <path d="M 0 ${SURF} Q 200 ${SURF - 6} ${W} ${SURF}" stroke="var(--line-2)" stroke-width="1.4" fill="none" opacity=".7"/>
          <rect x="0" y="${SURF}" width="${W}" height="${FLOOR - SURF}" fill="color-mix(in srgb, var(--accent) 4%, transparent)" opacity=".5"/>
          ${cols}${fish}${stripes}
          <g class="aq-card">
            <rect x="${W - 138}" y="10" width="124" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 128}" y="28" class="aq-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="${W - 128}" y="41" class="aq-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水族箱", eyebrow: "AQUARIUM", render };
})();
