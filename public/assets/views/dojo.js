/* --------------------------------------------------------------------- dojo
 * Dojo — a training hall: every agent is a wooden dummy post,
 * strike marks scar its body per session (colour = provider, position
 * randomised); the quota windows are hanging scrolls whose unrolled
 * length = used %. An over-full scroll frays its end.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dojo";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 260;
    const n = Math.max(1, sessions.length);
    const slot = (W - 60) / n;

    // hanging scrolls — quota windows along the top edge
    const scrolls = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const x = 34 + i * ((W - 68) / Math.max(1, quotas.length - 1));
      const hot = w.used >= 85;
      const len = 18 + (w.used / 100) * 52;
      return `<g class="dj-scroll${hot ? " hot" : ""}">
        <line x1="${x - 8}" y1="12" x2="${x + 8}" y2="12" stroke="var(--line-2)" stroke-width="2"/>
        <rect x="${x - 8}" y="12" width="16" height="${len}" rx="1" fill="${hot ? "var(--red)" : m.color || "#a07850"}" opacity=".85"/>
        <path d="M ${x - 6} ${12 + len} L ${x + 6} ${12 + len} L ${x + 6} ${14 + len} L ${x - 6} ${14 + len} Z" fill="var(--line-2)" opacity=".7"/>
        ${hot ? `<path d="M ${x - 6} ${14 + len} L ${x + 6} ${14 + len} L ${x + 2} ${18 + len} L ${x - 2} ${18 + len} Z" fill="var(--red)" opacity=".6"/>` : ""}
        <text x="${x + 12}" y="${12 + len / 2}" class="dj-pct">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // wooden dummies — one post per agent
    const dummies = sessions.map((s, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(ameta, s.agent);
      const pm = metaOf(pmeta, s.provider);
      const dead = s.status === "err";
      const h = 52 + Math.min(18, (s.tokens || 0) / 8e5);
      const strikes = (s.tries || []).slice(0, 4).map((t, j) => {
        const ty = FLOOR - 20 - j * 12;
        const tl = 10 + (j % 3) * 4;
        const tcol = metaOf(pmeta, t.provider).color || "#a07850";
        return `<line x1="${x - 10}" y1="${ty}" x2="${x + tl}" y2="${ty}" stroke="${tcol}" stroke-width="2" opacity="${t.status === "err" ? 1 : .55}" ${t.status === "err" ? `stroke-dasharray="2 2"` : ""}/>`;
      }).join("");
      return `<g class="dj-dummy${dead ? " dead" : ""}">
        <rect x="${x - 9}" y="${FLOOR - h - 24}" width="18" height="${h + 24}" rx="4" fill="${m.color || "#a07850"}" opacity=".9"/>
        <ellipse cx="${x}" cy="${FLOOR - h - 22}" rx="9" ry="6" fill="${m.color || "#a07850"}" opacity=".9"/>
        <line x1="${x - 20}" y1="${FLOOR - h + 8}" x2="${x + 20}" y2="${FLOOR - h + 8}" stroke="var(--line-2)" stroke-width="2" opacity=".6"/>
        <line x1="${x}" y1="${FLOOR - h - 24}" x2="${x}" y2="${FLOOR - h - 32}" stroke="var(--line-2)" stroke-width="1.5"/>
        <circle cx="${x}" cy="${FLOOR - h - 32}" r="3" fill="${pm.color || "var(--amber)"}"/>
        ${strikes}
        <text x="${x.toFixed(1)}" y="${FLOOR + 16}" class="dj-name" text-anchor="middle">${esc((m.name || s.agent).slice(0, 6))}</text>
        <text x="${x.toFixed(1)}" y="${FLOOR + 28}" class="dj-sub" text-anchor="middle">${s.tps ? s.tps.toFixed(0) + " t/s" : "—"}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dj-wrap">
        <div class="dj-head"><b>DOJO</b><span>桩=agent 痕=tries 卷=配额${hotN ? " · " + hotN + " 卷将破" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${scrolls}${dummies}
          <g class="dj-card">
            <rect x="${W - 134}" y="14" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 124}" y="32" class="dj-k">${fmt(k.tokens)} · ${sessions.length} 桩</text>
            <text x="${W - 124}" y="45" class="dj-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "道场", eyebrow: "DOJO", render };
})();
