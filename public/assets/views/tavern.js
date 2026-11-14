/* ------------------------------------------------------------------ tavern
 * Tavern — the common room: every quota window is a barrel on the
 * rack — the ale level inside drops as the window fills, foam
 * sloshing faster the closer to last call; sessions are patrons
 * raising mugs along the bar.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tavern";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, RACK = 208, BAR = 246;

    // barrels on the rack
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const barrels = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const dry = w.used >= 85;
      const room = 1 - w.used / 100;
      const r = 21;
      // ale surface inside the barrel (seen through the face)
      const aleH = room * 30;
      const sway = Math.max(0.8, 3.2 - (w.used / 100) * 2.4);
      return `<g class="tv-barrel${dry ? " dry" : ""}">
        <g class="tv-ale" style="animation-duration:${sway.toFixed(2)}s">
          <clipPath id="tvClip${i}"><circle cx="${x.toFixed(1)}" cy="${RACK}" r="${r - 3}"/></clipPath>
          <circle cx="${x.toFixed(1)}" cy="${RACK}" r="${r - 3}" fill="var(--card-3)"/>
          <rect x="${(x - r).toFixed(1)}" y="${(RACK + r - 4 - aleH).toFixed(1)}" width="${r * 2}" height="${aleH.toFixed(1)}"
            fill="${dry ? "var(--red)" : m.color || "#d9a03f"}" clip-path="url(#tvClip${i})" opacity=".85"/>
        </g>
        <circle cx="${x.toFixed(1)}" cy="${RACK}" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="3"/>
        <line x1="${(x - r).toFixed(1)}" y1="${RACK}" x2="${(x + r).toFixed(1)}" y2="${RACK}" stroke="var(--line-2)" stroke-width="1" opacity=".5"/>
        <line x1="${x.toFixed(1)}" y1="${RACK - r}" x2="${x.toFixed(1)}" y2="${RACK + r}" stroke="var(--line-2)" stroke-width="1" opacity=".5"/>
        <text x="${x.toFixed(1)}" y="${RACK + r + 16}" class="tv-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${RACK + r + 27}" class="tv-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // patrons — sessions raising mugs along the bar
    const patrons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 80 + i * 76;
      const raise = 2.4 + (i % 3) * .8;
      return `<g class="tv-patron${dead ? " dead" : ""}" style="animation-duration:${raise}s">
        <circle cx="${x}" cy="${BAR - 26}" r="6" fill="${dead ? "var(--red)" : m.color || "#d9a03f"}"/>
        <rect x="${x - 7}" y="${BAR - 20}" width="14" height="12" rx="3" fill="${dead ? "var(--red)" : m.color || "#d9a03f"}" opacity=".85"/>
        <g class="tv-mug">
          <rect x="${x + 8}" y="${BAR - 34}" width="7" height="8" rx="1.5" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1"/>
          <rect x="${x + 9.5}" y="${BAR - 32.5}" width="4" height="4.5" rx="1" fill="${dead ? "var(--red)" : "#fbbf24"}" opacity=".8"/>
        </g>
        <text x="${x}" y="${BAR + 8}" class="tv-tok" text-anchor="middle">${esc((s.title || s.agent || "").slice(0, 8))}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const dryN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tv-wrap">
        <div class="tv-head"><b>TAVERN</b><span>桶=配额窗 客=会话 酒=余量${dryN ? " · " + dryN + " 桶见底" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${RACK - 30}" x2="${W - 30}" y2="${RACK - 30}" stroke="var(--line-2)" stroke-width="4"/>
          <line x1="30" y1="${BAR}" x2="${W - 30}" y2="${BAR}" stroke="var(--line-2)" stroke-width="5"/>
          ${barrels}${patrons}
          <g class="tv-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="tv-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="43" class="tv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酒馆", eyebrow: "TAVERN", render };
})();
