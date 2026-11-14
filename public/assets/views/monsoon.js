/* ------------------------------------------------------------------- monsoon
 * Monsoon — a stormy street: every quota window is a rain cloud whose
 * downpour thickens as used % climbs (≥85% lightning cracks beneath);
 * sessions are pedestrians with umbrellas hurrying along.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "monsoon";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33271057);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 240;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // clouds — rain density = used %, lightning when hot
    const clouds = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const cw = 28 + f * 10, ch = 14 + f * 8;
      const col = m.color || "#6a7a9a";
      const cy = 60 + f * 20;
      // rain lines — density scales with used %
      const drops = Math.round(4 + f * 12);
      let rain = "";
      for (let r = 0; r < drops; r++) {
        const rx = cx - cw * .5 + cw * (r / Math.max(1, drops - 1));
        rain += `<line x1="${rx.toFixed(1)}" y1="${(cy + ch).toFixed(1)}" x2="${(rx - 2).toFixed(1)}" y2="${(cy + ch + 10 + f * 8).toFixed(1)}" stroke="${hot ? "var(--red)" : "#7a9ab5"}" stroke-width="1" opacity="${(0.4 + f * .4).toFixed(2)}">
          <animate attributeName="y2" values="${(cy + ch + 10).toFixed(1)};${(cy + ch + 22).toFixed(1)}" dur="${(0.6 - f * .2).toFixed(2)}s" begin="${(-r * .08).toFixed(2)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(0.4 + f * .4).toFixed(2)};0" dur="${(0.6 - f * .2).toFixed(2)}s" begin="${(-r * .08).toFixed(2)}s" repeatCount="indefinite"/></line>`;
      }
      // lightning bolt on hot clouds
      const bolt = hot ? `<path d="M ${cx.toFixed(1)} ${(cy + ch).toFixed(1)} L ${(cx + 4).toFixed(1)} ${(cy + ch + 16).toFixed(1)} L ${(cx - 2).toFixed(1)} ${(cy + ch + 18).toFixed(1)} L ${(cx + 3).toFixed(1)} ${(cy + ch + 34).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1.6" opacity=".9">
          <animate attributeName="opacity" values="0;0;.9;0;.9;0" dur="2.4s" repeatCount="indefinite"/></path>` : "";
      return `<g class="mo-cloud${hot ? " hot" : ""}">
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(cw * .55).toFixed(1)}" ry="${ch.toFixed(1)}" fill="color-mix(in srgb, ${col} ${40 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        <ellipse cx="${(cx - cw * .35).toFixed(1)}" cy="${(cy + ch * .3).toFixed(1)}" rx="${(cw * .4).toFixed(1)}" ry="${(ch * .7).toFixed(1)}" fill="color-mix(in srgb, ${col} ${30 + f * 20}%, var(--card-2))" opacity=".85"/>
        <ellipse cx="${(cx + cw * .35).toFixed(1)}" cy="${(cy + ch * .3).toFixed(1)}" rx="${(cw * .4).toFixed(1)}" ry="${(ch * .7).toFixed(1)}" fill="color-mix(in srgb, ${col} ${30 + f * 20}%, var(--card-2))" opacity=".85"/>
        ${rain}${bolt}
        <text x="${cx.toFixed(1)}" y="${FLOOR + 18}" class="mo-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${FLOOR + 29}" class="mo-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pedestrians with umbrellas — sessions hurrying along
    const folks = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 18 - (s.tps || 0) / 8);
      const y = FLOOR - 4;
      return `<g class="mo-folk${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22 + i * 22} ${y};${W + 22} ${y}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M -6 -10 Q 0 -18 6 -10 L 0 -10 Z" fill="${dead ? "var(--red)" : m.color || "#d9754a"}"/>
        <line x1="0" y1="-10" x2="0" y2="0" stroke="#5a4632" stroke-width="1"/>
        <circle cx="0" cy="-2" r="3" fill="${dead ? "var(--red)" : m.color || "#d9b98a"}"/>
        <path d="M -3 1 h 6 l 1 7 h -8 Z" fill="#5a4632"/>
        <line x1="-1.5" y1="8" x2="-1.5" y2="14" stroke="#3a2a1a" stroke-width="1.4"/>
        <line x1="1.5" y1="8" x2="1.5" y2="14" stroke="#3a2a1a" stroke-width="1.4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mo-wrap">
        <div class="mo-head"><b>MONSOON</b><span>云=配额窗 雨=用量 伞=会话${hotN ? " · " + hotN + " 云雷电" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #161a24 46%, transparent)" rx="10"/>
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#2a2a3a" opacity=".9"/>
          ${clouds}${folks}
          <g class="mo-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mo-k">${fmt(k.tokens)} · ${sessions.length} 人</text>
            <text x="22" y="45" class="mo-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雨季", eyebrow: "MONSOON", render };
})();
