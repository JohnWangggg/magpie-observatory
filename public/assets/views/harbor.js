/* ------------------------------------------------------------------- harbor
 * Harbor — the busy waterfront: every agent is a cargo ship at dock,
 * each tries-attempt is a shipping container stacked aboard, the
 * provider windows are buoys bobbing on the tide line.
 *   - hull colour = agent, stack height = tries count
 *   - container colour = provider; failed = a tipped container
 *   - buoys on the tide line light up green→amber→red by quota heat
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harbor";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 8);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TIDE = 210;
    const n = Math.max(1, sessions.length);
    const dockW = 76;
    const x0 = 14;

    const ships = sessions.map((s, i) => {
      const x = x0 + i * (dockW + 8);
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const crates = (s.tries || []).slice(0, 4).map((t, j) => {
        const pm = metaOf(pmeta, t.provider);
        const tip = t.status === "err";
        return `<rect class="hb-crate${tip ? " tip" : ""}" x="${(x + 20 + j * 13).toFixed(1)}" y="${(TIDE - 26 - j * 0).toFixed(1)}" width="11" height="10" rx="1"
          fill="${tip ? "var(--red)" : pm.color || "#8b7cf6"}" ${tip ? `transform="rotate(-14 ${x + 26} ${TIDE - 8})"` : ""}/>`;
      }).join("");
      return `<g class="hb-ship${dead ? " dead" : ""}" style="--sc:${m.color || "#8b7cf6"}">
        <path d="M ${x} ${TIDE} L ${x + dockW - 8} ${TIDE} L ${x + dockW - 24} ${TIDE + 22} L ${x + 10} ${TIDE + 22} Z"
          fill="${m.color || "#8b7cf6"}" opacity="${dead ? .4 : .85}"/>
        <rect x="${x + 8}" y="${TIDE - 22}" width="18" height="22" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.2"/>
        <rect x="${x + 11}" y="${TIDE - 34}" width="4" height="14" fill="var(--line-2)"/>
        ${crates}
        <text x="${x + 10}" y="${TIDE + 40}" class="hb-name">${esc((m.name || s.agent).slice(0, 7))}</text>
        <text x="${x + 10}" y="${TIDE + 52}" class="hb-sub">${s.tps ? s.tps.toFixed(0) + " tok/s" : "—"} · ${s.tries ? s.tries.length : 0}t</text>
      </g>`;
    }).join("");

    const buoys = quotas.map((w, i) => {
      const x = 30 + i * ((W - 60) / Math.max(1, quotas.length - 1));
      const pm = metaOf(pmeta, w.prov);
      const heat = w.used >= 85 ? "hot" : w.used >= 60 ? "warm" : "cool";
      return `<g class="hb-buoy ${heat}" style="animation-delay:${(i * 0.35).toFixed(2)}s">
        <line x1="${x.toFixed(1)}" y1="${TIDE + 64}" x2="${x.toFixed(1)}" y2="${TIDE + 78}" stroke="var(--line-2)"/>
        <circle cx="${x.toFixed(1)}" cy="${TIDE + 62}" r="5.5" fill="${heat === "hot" ? "var(--red)" : heat === "warm" ? "var(--amber)" : pm.color || "#4ade80"}"/>
        <text x="${x.toFixed(1)}" y="${TIDE + 96}" class="hb-pct" text-anchor="middle">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // sky card: today's totals pinned over the sky
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const fmtMoney = ctx.fmtMoney || (v => "$" + Number(v).toFixed(2));
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hb-wrap">
        <div class="hb-head"><b>HARBOR</b><span>船=agent 箱=tries 浮标=配额${hotN ? " · " + hotN + " 浮标红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${TIDE + 6}" fill="color-mix(in srgb, var(--card-2) 15%, transparent)"/>
          <line x1="0" y1="${TIDE}" x2="${W}" y2="${TIDE}" stroke="var(--line-2)" stroke-width="1.4" class="hb-tide"/>
          <rect x="0" y="${TIDE + 6}" width="${W}" height="${H - TIDE - 6}" fill="color-mix(in srgb, var(--card) 55%, transparent)"/>
          ${ships}
          ${buoys}
          <g class="hb-card">
            <rect x="${W - 142}" y="14" width="128" height="42" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="32" class="hb-k">${fmt(k.tokens)} · ${fmtMoney(k.cost)}</text>
            <text x="${W - 130}" y="46" class="hb-ksub">今日 tokens · ${sessions.length} 船在泊</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "港口", eyebrow: "HARBOR", render };
})();
