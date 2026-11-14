/* ------------------------------------------------------------------- canyon
 * Canyon — a stratified gorge: every quota window is a rock layer
 * whose depth erodes as used % climbs (≥85% the stratum glows ember
 * and sheds a pebble); sessions are hikers walking the canyon floor.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "canyon";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(62748571);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 236;
    const n = Math.max(1, quotas.length);
    const gap = (W - 56) / n;

    // layered strata per column — deeper cut the fuller it runs
    const strata = quotas.map((w, i) => {
      const x = 32 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const depth = 40 + f * 150;                       // eroded depth
      const colW = gap - 8;
      const col = hot ? "#b85a3a" : m.color || "#a87850";
      // 3–5 strata bands descending to the floor, each thinner near top
      const bands = Math.min(5, 3 + Math.round(f * 2));
      let rock = "";
      for (let b = 0; b < bands; b++) {
        const by = FLOOR - depth + (depth / bands) * b;
        const bw = colW * (1 - (b / bands) * .5);
        const bx = x + (colW - bw) / 2;
        rock += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${(depth / bands - 2).toFixed(1)}" rx="3"
          fill="color-mix(in srgb, ${col} ${26 + b * 12}%, var(--card-2))" stroke="${col}" stroke-opacity=".35"/>`;
      }
      const pebble = hot ? `<circle cx="${x + colW / 2}" cy="${FLOOR - depth - 6}" r="2.4" fill="var(--red)">
          <animate attributeName="cy" values="${FLOOR - depth - 6};${FLOOR - 4}" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="cy-strata${hot ? " hot" : ""}">
        ${rock}${pebble}
        <text x="${(x + colW / 2).toFixed(1)}" y="${FLOOR + 18}" class="cy-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x + colW / 2).toFixed(1)}" y="${FLOOR + 29}" class="cy-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // hikers — sessions walking the canyon floor
    const hikers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = FLOOR - 4;
      const dur = Math.max(6, 18 - (s.tps || 0) / 8);
      return `<g class="cy-hiker${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24 + i * 30} ${y};${W + 30} ${y}" dur="${dur}s" begin="${(-i * 3.5).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-12" r="3" fill="${dead ? "var(--red)" : m.color || "#d9b98a"}"/>
        <path d="M -3 -9 h 6 l 1.5 9 h -9 Z" fill="${dead ? "var(--red)" : "#6a5a48"}"/>
        <line x1="-1.5" y1="0" x2="-1.5" y2="6" stroke="${dead ? "var(--red)" : "#6a5a48"}" stroke-width="1.6"/>
        <line x1="1.5" y1="0" x2="1.5" y2="6" stroke="${dead ? "var(--red)" : "#6a5a48"}" stroke-width="1.6"/>
        <rect x="3" y="-10" width="4" height="6" rx="1.4" fill="${m.color || "#e8b25a"}" opacity=".85"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cy-wrap">
        <div class="cy-head"><b>CANYON</b><span>层=配额窗 深=用量 客=会话${hotN ? " · " + hotN + " 层崩落" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #241a10 32%, transparent)" rx="10"/>
          <rect x="16" y="${FLOOR}" width="${W - 32}" height="3" rx="1.5" fill="#5a4632" opacity=".9"/>
          ${strata}${hikers}
          <g class="cy-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="cy-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="43" class="cy-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "峡谷", eyebrow: "CANYON", render };
})();
