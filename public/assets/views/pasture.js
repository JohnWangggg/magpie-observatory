/* ------------------------------------------------------------------- pasture
 * Pasture — rolling grassland: every quota window is a hill whose crest
 * rises as used % climbs (≥85% the grass dries to straw);
 * sessions are sheep & cattle grazing on the slope.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pasture";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(20883169);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 7);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 240;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // hills — crest height = used %, dry grass color when hot
    const hills = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hgt = 24 + f * 130;
      const col = m.color || "#7a9a4a";
      const grass = hot ? "#c9a24b" : col;
      // hill silhouette
      const hill = `<path d="M ${(cx - gap * .5).toFixed(1)} ${FLOOR} Q ${cx.toFixed(1)} ${(FLOOR - hgt * 1.6).toFixed(1)} ${(cx + gap * .5).toFixed(1)} ${FLOOR} Z"
        fill="color-mix(in srgb, ${grass} ${32 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : grass}" stroke-width="1"/>`;
      // grazing grass texture — little ticks
      const ticks = Array.from({ length: Math.round(4 + f * 8) }, (_, k) => {
        const tx = cx - gap * .35 + (gap * .7) * (k / Math.max(1, Math.round(4 + f * 8) - 1));
        const ty = FLOOR - hgt * (0.3 + rnd() * 0.9);
        return `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${(ty - 4 - f * 3).toFixed(1)}" stroke="${grass}" stroke-width="1" opacity=".6"/>`;
      }).join("");
      // wind sway
      const sway = `<animateTransform attributeName="transform" type="skewX" values="0;${(f * 3).toFixed(1)};0" dur="${(3 + f * 2).toFixed(1)}s" repeatCount="indefinite"/>`;
      return `<g class="pa-hill${hot ? " hot" : ""}">
        ${hill}${ticks}${sway}
        <text x="${cx.toFixed(1)}" y="${FLOOR + 18}" class="pa-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${FLOOR + 29}" class="pa-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // livestock — sessions grazing (sheep = circle+wool, cow = box+legs)
    const stock = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 18 - (s.tps || 0) / 8);
      const lane = i % n;
      const cx0 = 30 + gap / 2 + lane * gap;
      const y = FLOOR - 30 - rnd() * 80;
      const cow = i % 3 === 2;
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      const animal = cow
        ? `<rect x="-6" y="-5" width="12" height="7" rx="1.5" fill="${col}"/>
           <rect x="-7" y="-2" width="4" height="5" rx="1" fill="${col}"/>
           <line x1="-4" y1="2" x2="-4" y2="6" stroke="#5a4632" stroke-width="1"/>
           <line x1="4" y1="2" x2="4" y2="6" stroke="#5a4632" stroke-width="1"/>`
        : `<circle cx="0" cy="0" r="4" fill="${col}"/>
           <circle cx="0" cy="-3" r="2.5" fill="${col}"/>
           <circle cx="-3" cy="-1" r="2" fill="${col}"/>
           <circle cx="3" cy="-1" r="2" fill="${col}"/>
           <line x1="-2" y1="3" x2="-2" y2="6" stroke="#5a4632" stroke-width="1"/>
           <line x1="2" y1="3" x2="2" y2="6" stroke="#5a4632" stroke-width="1"/>`;
      return `<g class="pa-stock${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${(cx0 - 40).toFixed(1)} ${y.toFixed(1)};${(cx0 + 40).toFixed(1)} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * 1.7).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        ${animal}
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pa-wrap">
        <div class="pa-head"><b>PASTURE</b><span>坡=配额窗 高=用量 畜=会话${hotN ? " · " + hotN + " 坡枯黄" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #18201a 40%, transparent)" rx="10"/>
          <circle cx="360" cy="40" r="14" fill="#f2e3b3" opacity=".85"/>
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#3a3228" opacity=".9"/>
          ${hills}${stock}
          <g class="pa-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pa-k">${fmt(k.tokens)} · ${sessions.length} 畜</text>
            <text x="22" y="45" class="pa-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "牧场", eyebrow: "PASTURE", render };
})();
