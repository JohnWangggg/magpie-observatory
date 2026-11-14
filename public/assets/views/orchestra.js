/* ---------------------------------------------------------------- orchestra
 * Orchestra — the pit before the stage: every quota window is a
 * section of the orchestra — a concentric "volume ring" fills as the
 * window heats up; sessions are notes drifting up from the pit on a
 * staff; a conductor's baton ticks the rhythm.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "orchestra";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, STAGE = 240;

    // staff lines
    const staff = [86, 104, 122, 140, 158].map(y =>
      `<line x1="30" y1="${y}" x2="${W - 30}" y2="${y}" stroke="var(--line-2)" stroke-width="1" opacity=".55"/>`
    ).join("");

    // sections — concentric volume rings in the pit
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const sections = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const R = 26;
      const frac = w.used / 100;
      const C = 2 * Math.PI * R;
      const off = C * (1 - frac);
      return `<g class="oc-sec${hot ? " hot" : ""}">
        <circle cx="${x.toFixed(1)}" cy="${STAGE}" r="${R + 7}" fill="none" stroke="var(--line-2)" stroke-width="1" opacity=".5"/>
        <circle cx="${x.toFixed(1)}" cy="${STAGE}" r="${R}" fill="none" stroke="${hot ? "var(--red)" : m.color || "#fb923c"}" stroke-width="5"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" stroke-linecap="round"
          transform="rotate(-90 ${x.toFixed(1)} ${STAGE})"/>
        <circle cx="${x.toFixed(1)}" cy="${STAGE}" r="${R - 9}" fill="var(--card-3)" stroke="var(--line-2)" stroke-width=".8"/>
        <text x="${x.toFixed(1)}" y="${STAGE + 4}" class="oc-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${STAGE + R + 16}" class="oc-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // notes — sessions drift up from the staff
    const notes = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const startX = 50 + i * ((W - 100) / Math.max(1, sessions.length - 1));
      const dur = Math.max(4, 11 - (s.tps || 0) / 18);
      const pitch = [0, 1, 2, 3, 4][i % 5]; // staff line index
      const y = 86 + pitch * 18;
      return `<g class="oc-note${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 1.1).toFixed(1)}s">
        <ellipse cx="0" cy="0" rx="5" ry="4" fill="${dead ? "var(--red)" : m.color || "#fb923c"}" transform="rotate(-18)"/>
        <line x1="4" y1="-1" x2="4" y2="-24" stroke="${dead ? "var(--red)" : m.color || "#fb923c"}" stroke-width="1.6"/>
        <animateTransform attributeName="transform" type="translate" values="${startX} ${y + 40};${startX} ${y - 10}" dur="${dur}s" begin="${(-i * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    // conductor
    const cond = `<g class="oc-cond">
      <circle cx="200" cy="196" r="6" fill="var(--fg-2)"/>
      <line x1="200" y1="202" x2="200" y2="222" stroke="var(--fg-2)" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="200" y1="208" x2="188" y2="196" stroke="var(--fg-2)" stroke-width="2" stroke-linecap="round"/>
      <g class="oc-baton">
        <line x1="200" y1="208" x2="222" y2="186" stroke="var(--fg-2)" stroke-width="2" stroke-linecap="round"/>
        <line x1="222" y1="186" x2="234" y2="172" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/>
      </g>
    </g>`;

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="oc-wrap">
        <div class="oc-head"><b>ORCHESTRA</b><span>环=配额窗 音符=会话 指挥=节拍${hotN ? " · " + hotN + " 环满弦" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          ${staff}${notes}${cond}${sections}
          <g class="oc-card">
            <rect x="14" y="12" width="124" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="oc-k">${fmt(k.tokens)} · ${sessions.length} 符</text>
            <text x="22" y="43" class="oc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "管弦乐", eyebrow: "ORCHESTRA", render };
})();
