/* -------------------------------------------------------------------- reef
 * Reef — the coral shelf: every quota window is a coral head — the
 * taller and more saturated the colony, the more headroom is left
 * (bleached white when it runs dry); sessions are fish schooling
 * through the water column.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "reef";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SAND = 252;

    // coral heads — branch count + height = headroom
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const corals = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const dry = w.used >= 85;
      const room = 1 - w.used / 100;
      const hgt = 22 + room * 46;
      const c = dry ? "#e8e4da" : m.color || "#fb7185";
      // 3 branches fanning from a base
      const branches = [-1, 0, 1].map(b => {
        const tipX = x + b * 10;
        return `<path class="rf-branch" style="animation-delay:${((i + b + 1) * .5).toFixed(1)}s"
          d="M ${x.toFixed(1)} ${SAND} Q ${(x + b * 6).toFixed(1)} ${(SAND - hgt * .6).toFixed(1)} ${tipX.toFixed(1)} ${(SAND - hgt).toFixed(1)}"
          fill="none" stroke="${c}" stroke-width="4.4" stroke-linecap="round" opacity="${dry ? .5 : .9}"/>`;
      }).join("");
      return `<g class="rf-coral${dry ? " dry" : ""}">
        ${branches}
        <ellipse cx="${x.toFixed(1)}" cy="${SAND}" rx="13" ry="4" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1"/>
        <text x="${x.toFixed(1)}" y="${SAND + 16}" class="rf-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${SAND + 27}" class="rf-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fish — sessions schooling through the water column
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = 70 + (i % 4) * 34;
      const dur = Math.max(5, 14 - (s.tps || 0) / 15);
      const dir = i % 2 ? -1 : 1;
      const body = `<g transform="scale(${dir},1)">
        <ellipse cx="0" cy="0" rx="8" ry="4.4" fill="${dead ? "var(--red)" : m.color || "#fb7185"}"/>
        <path d="M -7 0 L -13 -4.6 L -13 4.6 Z" fill="${dead ? "var(--red)" : m.color || "#fb7185"}" opacity=".85"/>
        <circle cx="4.6" cy="-1.2" r="1.1" fill="var(--card-1)"/>
      </g>`;
      return `<g class="rf-fish${dead ? " dead" : ""}">
        ${body}
        <animateTransform attributeName="transform" type="translate"
          values="${dir > 0 ? -20 : W + 20} ${y};${dir > 0 ? W + 20 : -20} ${y}"
          dur="${dur}s" begin="${(-i * 1.6).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    // bubbles
    const bubbles = [0, 1, 2, 3].map(i => {
      const x = 70 + i * 90;
      return `<circle class="rf-bub" style="animation-delay:${(i * .9).toFixed(1)}s" cx="${x}" cy="${SAND - 10}" r="2.4" fill="none" stroke="var(--fg-2)" stroke-width="1" opacity=".4"/>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const dryN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rf-wrap">
        <div class="rf-head"><b>REEF</b><span>瑚=配额窗 鱼=会话 高=余量${dryN ? " · " + dryN + " 礁漂白" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <rect x="0" y="${SAND}" width="${W}" height="${H - SAND}" fill="color-mix(in srgb, var(--amber) 7%, transparent)"/>
          <line x1="20" y1="${SAND}" x2="${W - 20}" y2="${SAND}" stroke="var(--line-2)" stroke-width="1.4"/>
          ${bubbles}${corals}${fish}
          <g class="rf-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="rf-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="43" class="rf-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "珊瑚礁", eyebrow: "REEF", render };
})();
