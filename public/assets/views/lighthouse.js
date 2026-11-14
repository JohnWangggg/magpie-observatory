/* ---------------------------------------------------------------- lighthouse
 * Lighthouse — a coastal lookout: the horizon carries the six quota
 * windows as lighthouses on the shore; every live session sweeps a beam
 * across the sky; the water below ripples with the live tps.
 *   - tower = provider window, beam width / rotation speed = used %
 *   - beam colour = agent, flare strength = tps
 *   - ≥85% towers burn red and the sky tints that way
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lighthouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};

    const W = 400, H = 300, HOR = 210;
    const n = Math.max(1, quotas.length);
    const slot = (W - 40) / n;

    const towers = quotas.map((w, i) => {
      const x = 40 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const h = 58 - (w.used / 100) * 20;            // taller = fresher
      const lampY = HOR - h;
      return `<g class="lh-tower${hot ? " hot" : ""}" style="--pc:${m.color || "#fbbf24"}">
        <rect x="${(x - 6).toFixed(1)}" y="${(HOR - h).toFixed(1)}" width="12" height="${h}" fill="var(--card-3)" stroke="var(--line-2)"/>
        <rect x="${(x - 8).toFixed(1)}" y="${(HOR - h - 8).toFixed(1)}" width="16" height="8" rx="2" fill="${hot ? "var(--red)" : m.color || "#fbbf24"}" opacity=".95"/>
        <circle cx="${x.toFixed(1)}" cy="${(lampY - 4).toFixed(1)}" r="3" fill="${hot ? "var(--red)" : m.color || "#fbbf24"}" class="lh-lamp"/>
        <text x="${x.toFixed(1)}" y="${HOR + 14}" class="lh-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${HOR + 26}" class="lh-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // beams — one arc wedge per session, rotating around the horizon line
    const beams = sessions.map((s, i) => {
      const x = 60 + i * ((W - 120) / Math.max(1, sessions.length - 1));
      const m = metaOf(ameta, s.agent);
      const wid = 12 + Math.min(18, (s.tps || 0) / 6);
      const dead = s.status === "err";
      const len = 150 + Math.min(90, (s.tokens || 0) / 1e5);
      return `<g class="lh-beam${dead ? " dead" : ""}" style="animation-delay:${(-i * 0.9).toFixed(1)}s;transform-origin:${x.toFixed(1)}px ${HOR - 8}px">
        <path d="M ${x.toFixed(1)} ${HOR - 8} L ${(x - wid).toFixed(1)} ${(HOR - 8 - len).toFixed(1)} L ${(x + wid).toFixed(1)} ${(HOR - 8 - len).toFixed(1)} Z"
          fill="${m.color || "#fbbf24"}" opacity="${dead ? .1 : .22}"/>
      </g>`;
    }).join("");

    // waterline + ripples driven by the live tps
    const tps = Math.max(0.5, k.tps || 1);
    const ripples = Array.from({ length: 5 }, (_, i) => {
      const y = HOR + 40 + i * 10;
      const w = 60 + i * 22;
      return `<path class="lh-ripple" style="animation-duration:${(3.2 - Math.min(2, tps / 40)).toFixed(1)}s;animation-delay:${(i * 0.4).toFixed(1)}s"
        d="M ${(W / 2 - w / 2).toFixed(1)} ${y} q ${(w / 4).toFixed(1)} -8 ${(w / 2).toFixed(1)} 0 t ${(w / 2).toFixed(1)} 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".6"/>`;
    }).join("");

    const hotN = quotas.filter(w => w.used >= 85).length;
    host.innerHTML = `
      <div class="lh-wrap">
        <div class="lh-head"><b>LIGHTHOUSE</b><span>塔=配额 光束=会话 涟漪=TPS${hotN ? " · " + hotN + " 塔将熄" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${HOR + 34}" fill="color-mix(in srgb, var(--card-2) 18%, transparent)"/>
          ${beams}
          <line x1="0" y1="${HOR}" x2="${W}" y2="${HOR}" stroke="var(--line-2)" stroke-width="1.2"/>
          <rect x="0" y="${HOR + 34}" width="${W}" height="${H - HOR - 34}" fill="color-mix(in srgb, var(--card) 60%, transparent)"/>
          ${towers}
          ${ripples}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯塔", eyebrow: "LIGHTHOUSE", render };
})();
