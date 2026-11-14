/* ----------------------------------------------------------------- windmill
 * Windmill — the prairie turbine: every quota window is a turbine on
 * the plain — blades spin faster the hotter it is; sessions are birds
 * circling the towers; a sun drifts behind the field.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "windmill";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GROUND = 232;

    const turbines = quotas.map((w, i) => {
      const n = Math.max(1, quotas.length);
      const x = 50 + i * ((W - 100) / Math.max(1, n - 1));
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const tower = 52 + (1 - w.used / 100) * 38; // fuller → shorter
      const spin = Math.max(0.9, 5.5 - (w.used / 100) * 4.6);
      const blades = [0, 120, 240].map(a =>
        `<line x1="${x.toFixed(1)}" y1="${GROUND - tower}" x2="${x.toFixed(1)}" y2="${GROUND - tower - 26}" stroke="${hot ? "var(--red)" : m.color || "#fb923c"}" stroke-width="3" stroke-linecap="round" transform="rotate(${a} ${x.toFixed(1)} ${GROUND - tower})"/>`
      ).join("");
      return `<g class="wm-mill${hot ? " hot" : ""}">
        <line x1="${x.toFixed(1)}" y1="${GROUND}" x2="${x.toFixed(1)}" y2="${GROUND - tower}" stroke="var(--fg-2)" stroke-width="2.4" opacity=".8"/>
        <g class="wm-rotor" style="animation-duration:${spin.toFixed(2)}s;transform-origin:${x.toFixed(1)}px ${GROUND - tower}px">
          ${blades}
          <circle cx="${x.toFixed(1)}" cy="${GROUND - tower}" r="3.4" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1"/>
        </g>
        <text x="${x.toFixed(1)}" y="${GROUND + 14}" class="wm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${GROUND + 25}" class="wm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // birds circling — sessions
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cy = 60 + i * 26;
      const dur = Math.max(5, 14 - (s.tps || 0) / 15);
      const rx = 60 + (i % 3) * 26;
      return `<g class="wm-bird${dead ? " dead" : ""}">
        <ellipse cx="${W / 2}" cy="${cy}" rx="${rx}" ry="12" fill="none" stroke="var(--line-2)" stroke-width=".6" stroke-dasharray="2 4" opacity=".4"/>
        <circle r="3" fill="${dead ? "var(--red)" : m.color || "#fb923c"}">
          <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(-i * 1.4).toFixed(1)}s"
            path="M ${W / 2 - rx} ${cy} a ${rx} 12 0 1 1 ${rx * 2} 0 a ${rx} 12 0 1 1 -${rx * 2} 0"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wm-wrap">
        <div class="wm-head"><b>WINDMILL</b><span>塔=配额窗 叶速=热度 鸟=会话${hotN ? " · " + hotN + " 塔灼叶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <circle cx="${W - 70}" cy="52" r="17" fill="var(--amber)" opacity=".85"/>
          <circle cx="${W - 70}" cy="52" r="26" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".25"/>
          <line x1="20" y1="${GROUND}" x2="${W - 20}" y2="${GROUND}" stroke="var(--line-2)" stroke-width="2"/>
          ${[0,1,2].map(i => `<path d="M ${60 + i * 110} ${GROUND} q 4 -12 0 -18" stroke="var(--green)" stroke-width="1.2" fill="none" opacity=".5"/>`).join("")}
          ${birds}${turbines}
          <g class="wm-card">
            <rect x="14" y="12" width="118" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="wm-k">${fmt(k.tokens)} · ${sessions.length} 鸟</text>
            <text x="22" y="43" class="wm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "风车塔", eyebrow: "WINDMILL", render };
})();
