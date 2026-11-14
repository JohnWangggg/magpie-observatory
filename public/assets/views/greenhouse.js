/* ---------------------------------------------------------------- greenhouse
 * Greenhouse — a two-tier nursery: a shelf for every agent, live
 * sessions grow as potted seedlings (height = tokens, colour = agent),
 * quota windows hang as thermometers on the back wall. A thermometer
 * over 85% pops red and its pot gets a heat shimmer.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "greenhouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const shelf1 = 200, shelf2 = 268;

    // group sessions by agent and tile them across the two shelves
    const byAgent = new Map();
    sessions.forEach(s => byAgent.set(s.agent, (byAgent.get(s.agent) || []).concat(s)));
    const agents = [...byAgent.keys()];
    const perShelf = Math.ceil(agents.length / 2);

    const pots = agents.map((ag, i) => {
      const onTop = i < perShelf;
      const shelfY = onTop ? shelf1 : shelf2;
      const idx = onTop ? i : i - perShelf;
      const cnt = onTop ? perShelf : agents.length - perShelf;
      const x = 50 + (idx + 0.5) * ((W - 100) / Math.max(1, cnt));
      const m = metaOf(ameta, ag);
      const plants = (byAgent.get(ag) || []).slice(0, 3).map((s, j) => {
        const pm = metaOf(pmeta, s.provider);
        const h = 10 + Math.min(26, (s.tokens || 0) / 3e5);
        const dead = s.status === "err";
        const px = x - 8 + j * 8;
        return `<line class="gh-plant${dead ? " dead" : ""}" x1="${px}" y1="${shelfY - 8}" x2="${px}" y2="${(shelfY - 8 - h).toFixed(1)}"
          stroke="${dead ? "var(--red)" : pm.color || m.color || "#4ade80"}" stroke-width="2" stroke-linecap="round" opacity="${dead ? .35 : .9}"/>`;
      }).join("");
      return `<g class="gh-pot">
        <path d="M ${x - 14} ${shelfY - 8} L ${x + 14} ${shelfY - 8} L ${x + 10} ${shelfY} L ${x - 10} ${shelfY} Z" fill="${m.color || "#8b7cf6"}" opacity=".85"/>
        ${plants}
        <text x="${x - 18}" y="${shelfY + 14}" class="gh-name">${esc((m.name || ag).slice(0, 6))}</text>
        <text x="${x - 18}" y="${shelfY + 24}" class="gh-cnt">${(byAgent.get(ag) || []).length} 株</text>
      </g>`;
    }).join("");

    // thermometers along the left wall — one per quota window
    const therms = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const y = 60 + i * 34;
      const h = 26;
      const fill = (w.used / 100) * h;
      const hot = w.used >= 85;
      return `<g class="gh-therm${hot ? " hot" : ""}">
        <rect x="16" y="${y - h}" width="6" height="${h}" rx="3" fill="none" stroke="var(--line-2)" stroke-width="1"/>
        <rect x="16.8" y="${y - fill}" width="4.4" height="${fill}" rx="2" fill="${hot ? "var(--red)" : m.color || "var(--amber)"}"/>
        <circle cx="19" cy="${y + 6}" r="6" fill="${hot ? "var(--red)" : m.color || "var(--amber)"}" opacity=".95"/>
        <text x="34" y="${y + 4}" class="gh-tpct">${Math.round(w.used)}%</text>
        <text x="34" y="${y + 14}" class="gh-tname">${esc((m.name || w.prov).slice(0, 5))}</text>
      </g>`;
    }).join("");

    // sky panel: hanging sun
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gh-wrap">
        <div class="gh-head"><b>GREENHOUSE</b><span>架=agent 盆=会话 温度计=配额${hotN ? " · " + hotN + " 计报警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${shelf1}" x2="${W}" y2="${shelf1}" stroke="var(--line-2)" stroke-width="2"/>
          <line x1="0" y1="${shelf2}" x2="${W}" y2="${shelf2}" stroke="var(--line-2)" stroke-width="2"/>
          ${therms}${pots}
          <g class="gh-card">
            <rect x="${W - 136}" y="14" width="122" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 126}" y="32" class="gh-k">${fmt(k.tokens)} · ${sessions.length} 株</text>
            <text x="${W - 126}" y="45" class="gh-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "温室", eyebrow: "GREENHOUSE", render };
})();
