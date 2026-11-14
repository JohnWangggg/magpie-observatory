/* ------------------------------------------------------------------- arcade
 * Arcade — the neon hall: every provider window is a cabinet, its
 * marquee lights = the window's used %; a coin slot below fills as
 * tokens drop; sessions are joysticks playing at the cabinets.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "arcade";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 258;
    const n = Math.max(1, quotas.length);
    const slot = (W - 60) / n;
    const cabW = Math.min(62, slot - 8);

    const cabs = quotas.map((w, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const y = FLOOR - 108;
      const lit = Math.round(w.used / 100 * 5); // 0-5 marquee bulbs lit
      return `<g class="ar-cab${hot ? " hot" : ""}" style="--pc:${m.color || "#f472b6"}">
        <rect x="${(x - cabW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${cabW.toFixed(1)}" height="108" rx="4" fill="var(--card-2)" stroke="var(--line-2)"/>
        <rect x="${(x - cabW / 2 + 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" width="${(cabW - 8).toFixed(1)}" height="14" rx="2" fill="${hot ? "var(--red)" : m.color || "#f472b6"}" opacity=".9"/>
        <rect x="${(x - cabW / 2 + 6).toFixed(1)}" y="${(y + 24).toFixed(1)}" width="${(cabW - 12).toFixed(1)}" height="36" rx="2" fill="var(--bg)" stroke="var(--line-2)" stroke-width="1"/>
        <text x="${x.toFixed(1)}" y="${(y + 46).toFixed(1)}" class="ar-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        ${Array.from({ length: 5 }, (_, j) => `<circle cx="${(x - 16 + j * 8).toFixed(1)}" cy="${(y + 66).toFixed(1)}" r="2.2" fill="${j < lit ? (hot ? "var(--red)" : m.color || "#fbbf24") : "var(--line-2)"}" class="ar-bulb" style="animation-delay:${(j * 0.15 + i * 0.3).toFixed(2)}s"/>`).join("")}
        <rect x="${(x - 8).toFixed(1)}" y="${(y + 78).toFixed(1)}" width="16" height="10" rx="1" fill="var(--line-2)"/>
        <rect x="${(x - 8).toFixed(1)}" y="${(y + 78).toFixed(1)}" width="16" height="${(w.used / 10).toFixed(1)}" fill="${m.color || "#f472b6"}" opacity=".8"/>
        <text x="${x.toFixed(1)}" y="${FLOOR + 16}" class="ar-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // joysticks — sessions parked in front of cabinets
    const sticks = sessions.map((s, i) => {
      const x = 36 + i * ((W - 72) / Math.max(1, sessions.length - 1));
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const h = 22 + Math.min(14, (s.tokens || 0) / 9e5);
      return `<g class="ar-stick${dead ? " dead" : ""}" style="animation-delay:${(i * 0.4).toFixed(2)}s">
        <line x1="${x.toFixed(1)}" y1="${FLOOR - 8}" x2="${x.toFixed(1)}" y2="${FLOOR - 8 - h}" stroke="${dead ? "var(--red)" : m.color || "#f472b6"}" stroke-width="3" stroke-linecap="round" opacity="${dead ? .4 : .9}"/>
        <circle cx="${x.toFixed(1)}" cy="${FLOOR - 10 - h}" r="6" fill="${dead ? "var(--red)" : m.color || "#f472b6"}"/>
        <text x="${x.toFixed(1)}" y="${FLOOR + 20}" class="ar-sname" text-anchor="middle">${esc((m.name || s.agent).slice(0, 5))}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ar-wrap">
        <div class="ar-head"><b>ARCADE</b><span>机=配额窗 灯=热度 杆=会话${hotN ? " · " + hotN + " 机爆满" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${cabs}${sticks}
          <g class="ar-card">
            <rect x="${W - 136}" y="12" width="122" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 126}" y="30" class="ar-k">${fmt(k.tokens)} · ${sessions.length} 杆</text>
            <text x="${W - 126}" y="43" class="ar-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "电玩厅", eyebrow: "ARCADE", render };
})();
