/* ------------------------------------------------------------------- village
 * Village — a hamlet at dusk: every quota window is a cottage whose
 * chimney puffs thicker smoke as used % climbs (≥85% the smoke turns
 * ember-red); sessions are villagers walking home along the lane.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "village";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88213457);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 226;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // cottages — chimney smoke thickens with used %
    const houses = quotas.map((w, i) => {
      const cx = 36 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hw = 26 + f * 8, hh = 22 + f * 10;
      const roofH = 12 + f * 6;
      const col = m.color || "#a97a50";
      // smoke puffs — count scales with used %
      const ns = 1 + Math.round(f * 4);
      let smoke = "";
      for (let p = 0; p < ns; p++) {
        smoke += `<circle cx="${cx.toFixed(1)}" cy="${(FLOOR - hh - roofH - 4).toFixed(1)}" r="${(2 + f * 3).toFixed(1)}" fill="${hot ? "var(--red)" : "#b8c4d0"}" opacity=".6">
          <animate attributeName="cy" values="${(FLOOR - hh - roofH - 4).toFixed(1)};${(FLOOR - hh - roofH - 34 - rnd() * 16).toFixed(1)}" dur="${(2.2 - f * .6).toFixed(1)}s" begin="${(-p * .55).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="${(2 + f * 3).toFixed(1)};${(4 + f * 4).toFixed(1)}" dur="${(2.2 - f * .6).toFixed(1)}s" begin="${(-p * .55).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".6;0" dur="${(2.2 - f * .6).toFixed(1)}s" begin="${(-p * .55).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }
      // warm window light when heavy
      const win = `<rect x="${(cx - hw * .18).toFixed(1)}" y="${(FLOOR - hh * .55).toFixed(1)}" width="${(hw * .3).toFixed(1)}" height="${(hh * .3).toFixed(1)}" rx="1.5"
          fill="${hot ? "var(--red)" : "#f2c96b"}" opacity="${(0.6 + f * .4).toFixed(2)}"/>`;
      return `<g class="vl-house${hot ? " hot" : ""}">
        <rect x="${(cx - hw / 2).toFixed(1)}" y="${(FLOOR - hh).toFixed(1)}" width="${hw.toFixed(1)}" height="${hh.toFixed(1)}" rx="2"
          fill="color-mix(in srgb, ${col} ${40 + f * 20}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        <path d="M ${(cx - hw / 2 - 3).toFixed(1)} ${(FLOOR - hh).toFixed(1)} L ${cx.toFixed(1)} ${(FLOOR - hh - roofH).toFixed(1)} L ${(cx + hw / 2 + 3).toFixed(1)} ${(FLOOR - hh).toFixed(1)} Z"
          fill="color-mix(in srgb, ${col} 70%, #4a2a20)" stroke="${col}"/>
        <rect x="${(cx + hw * .15).toFixed(1)}" y="${(FLOOR - hh - roofH - 3).toFixed(1)}" width="5" height="8" fill="#6a4a32"/>
        ${win}${smoke}
        <text x="${cx.toFixed(1)}" y="${FLOOR + 18}" class="vl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${FLOOR + 29}" class="vl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // villagers — sessions walking home
    const folks = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 18 - (s.tps || 0) / 8);
      const y = FLOOR - 4;
      return `<g class="vl-folk${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22 + i * 24} ${y};${W + 22} ${y}" dur="${dur}s" begin="${(-i * 3.2).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-14" r="3" fill="${dead ? "var(--red)" : m.color || "#d9b98a"}"/>
        <path d="M -3 -11 h 6 l 2 11 h -10 Z" fill="${dead ? "var(--red)" : "#5a4632"}"/>
        <line x1="-1.5" y1="0" x2="-1.5" y2="7" stroke="${dead ? "var(--red)" : "#3a2a1a"}" stroke-width="1.5"/>
        <line x1="1.5" y1="0" x2="1.5" y2="7" stroke="${dead ? "var(--red)" : "#3a2a1a"}" stroke-width="1.5"/>
        <path d="M 4 -8 L 9 1" stroke="#a8865a" stroke-width="1.2" fill="none"/>
        <circle cx="9" cy="2" r="2" fill="#f2c96b" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vl-wrap">
        <div class="vl-head"><b>VILLAGE</b><span>屋=配额窗 烟=用量 人=会话${hotN ? " · " + hotN + " 屋红烟" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a1626 42%, transparent)" rx="10"/>
          <circle cx="352" cy="42" r="16" fill="#e8d9a8" opacity=".85"/>
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#4a3a28" opacity=".9"/>
          ${houses}${folks}
          <g class="vl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="vl-k">${fmt(k.tokens)} · ${sessions.length} 人</text>
            <text x="22" y="45" class="vl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "村落", eyebrow: "VILLAGE", render };
})();
