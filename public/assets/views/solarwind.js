/* ----------------------------------------------------------------- solarwind
 * Solar wind — a sun's corona in profile: every quota window is a
 * corona lobe whose prominence reaches farther as used % climbs
 * (≥85% it ejects a red flare); sessions are charged particles
 * streaming outward on the wind.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "solarwind";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(31415926);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 7);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = 200, CY = 155, SR = 58;
    const n = Math.max(1, quotas.length);

    // corona lobes — arc-length prominence = used %
    const lobes = quotas.map((w, i) => {
      const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#f0a04a";
      const reach = SR + 14 + f * 46;
      const tipX = CX + Math.cos(a0) * reach, tipY = CY + Math.sin(a0) * reach;
      const base1X = CX + Math.cos(a0 - .16) * (SR + 4), base1Y = CY + Math.sin(a0 - .16) * (SR + 4);
      const base2X = CX + Math.cos(a0 + .16) * (SR + 4), base2Y = CY + Math.sin(a0 + .16) * (SR + 4);
      const cpx = CX + Math.cos(a0) * (reach + 10), cpy = CY + Math.sin(a0) * (reach + 10);
      // prominence tongue
      const tongue = `<path d="M ${base1X.toFixed(1)} ${base1Y.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${base2X.toFixed(1)} ${base2Y.toFixed(1)} Z"
        fill="color-mix(in srgb, ${hot ? "var(--red)" : col} ${22 + f * 26}%, transparent)" stroke="${hot ? "var(--red)" : col}" stroke-width=".8" opacity=".85"/>`;
      // red ejection on hot lobes
      const eject = hot ? `<path d="M ${tipX.toFixed(1)} ${tipY.toFixed(1)} q ${Math.cos(a0) * 14} ${Math.sin(a0) * 14} ${Math.cos(a0) * 26} ${Math.sin(a0) * 26 + 6}"
        fill="none" stroke="var(--red)" stroke-width="1.6" opacity=".85">
        <animate attributeName="opacity" values=".85;0;.85" dur="1.4s" repeatCount="indefinite"/></path>` : "";
      const lx = CX + Math.cos(a0) * (reach + 20), ly = CY + Math.sin(a0) * (reach + 20);
      return `<g class="sw-lobe${hot ? " hot" : ""}">
        ${tongue}${eject}
        <text x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" class="sw-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${lx.toFixed(1)}" y="${(ly + 8).toFixed(1)}" class="sw-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sun disc + surface shimmer
    const sun = `<circle cx="${CX}" cy="${CY}" r="${SR}" fill="url(#swGrad)" stroke="#f8c06a" stroke-width="1.5"/>
      <circle cx="${CX}" cy="${CY}" r="${SR + 8}" fill="none" stroke="#f8a04a" stroke-width=".7" opacity=".4" stroke-dasharray="4 9">
        <animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="30s" repeatCount="indefinite"/></circle>`;

    // particles — sessions streaming outward on the wind
    const parts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const a = (i / Math.max(1, sessions.length)) * Math.PI * 2 + rnd() * .5;
      const dur = Math.max(3, 8 - (s.tps || 0) / 30);
      const dist = 60 + rnd() * 40;
      const size = 1.6 + Math.min(2, (s.tokens || 0) / 80000);
      const x0 = CX + Math.cos(a) * (SR + 12), y0 = CY + Math.sin(a) * (SR + 12);
      const x1 = CX + Math.cos(a) * (SR + dist + 80), y1 = CY + Math.sin(a) * (SR + dist + 80);
      return `<circle class="sw-part${dead ? " dead" : ""}" r="${size.toFixed(1)}" fill="${dead ? "var(--red)" : m.color || "#ffe0a0"}">
        <animateMotion dur="${dur}s" begin="${(-i * 1.1).toFixed(1)}s" repeatCount="indefinite" path="M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}"/>
        <animate attributeName="opacity" values="1;.6;0" dur="${dur}s" begin="${(-i * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
      </circle>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sw-wrap">
        <div class="sw-head"><b>SOLAR WIND</b><span>冕=配额窗 珥=用量 粒=会话${hotN ? " · " + hotN + " 冕爆发" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <defs><radialGradient id="swGrad" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stop-color="#fff3d0"/><stop offset="55%" stop-color="#f8b04a"/><stop offset="100%" stop-color="#e07830"/>
          </radialGradient></defs>
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #101018 50%, transparent)" rx="10"/>
          ${sun}${lobes}${parts}
          <g class="sw-card">
            <rect x="14" y="252" width="140" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)" opacity=".92"/>
            <text x="22" y="270" class="sw-k">${fmt(k.tokens)} · ${sessions.length} 粒</text>
            <text x="22" y="283" class="sw-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "太阳风", eyebrow: "SOLAR WIND", render };
})();
