/* -------------------------------------------------------------------- steppe
 * Steppe — wind waves rolling through golden grass: every quota
 * window is a grass swell whose crest rises as used % climbs
 * (≥85% a dust devil spins above it); sessions are horses
 * galloping across the plain.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "steppe";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(91161161);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // grass swells — crest = used %
    const swells = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c9a04a";
      const sh = 20 + f * 78;
      const sw = gap * .52;
      // swell — two overlapping arcs
      const swell = `<path d="M ${cx - sw} ${GY} Q ${cx - sw * .3} ${GY - sh} ${cx} ${GY - sh} Q ${cx + sw * .5} ${GY - sh} ${cx + sw} ${GY} Z"
        fill="color-mix(in srgb, ${col} ${35 + f * 35}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1.2"/>`;
      // wind strokes on the crest
      const wind = `<path d="M ${cx - sw * .5} ${GY - sh * .7} q ${sw * .4} -6 ${sw * .8} 0" fill="none" stroke="${hot ? "var(--red)" : "#e8d9a0"}" stroke-width=".9" opacity=".55">
        <animateTransform attributeName="transform" type="translate" values="0 0;4 -2;0 0" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // dust devil on hot swell
      const devil = hot ? `<g opacity=".8">
        <path d="M ${cx} ${GY - sh} q -8 -14 0 -26 q 8 -10 0 -20" fill="none" stroke="var(--red)" stroke-width="1.3">
          <animateTransform attributeName="transform" type="rotate" values="-8 ${cx} ${GY - sh - 20};8 ${cx} ${GY - sh - 20};-8 ${cx} ${GY - sh - 20}" dur="1.6s" repeatCount="indefinite"/></path>
        <circle cx="${cx}" cy="${GY - sh - 34}" r="2.2" fill="var(--red)">
          <animate attributeName="opacity" values=".9;.2;.9" dur="1s" repeatCount="indefinite"/></circle></g>` : "";
      return `<g class="sp-swell${hot ? " hot" : ""}">
        ${swell}${wind}${devil}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="sp-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="sp-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // horses — sessions galloping
    const herd = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 10);
      const y = GY - 10 - (i % 3) * 16;
      const size = 4 + Math.min(4, (s.tokens || 0) / 50000);
      return `<g class="sp-horse${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-28} ${y.toFixed(1)};${W + 28} ${(y + 5).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.6).toFixed(1)}s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 ${-size * .5};0 0" dur=".45s" begin="${(-i * .2).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .85}" fill="${dead ? "var(--red)" : m.color || "#a8794a"}"/>
        <path d="M ${size * 1.3} ${-size * .6} L ${size * 2} ${-size * 1.8} L ${size * 2.5} ${-size * 1.5} L ${size * 1.9} ${-size * .2} Z"
          fill="${dead ? "var(--red)" : m.color || "#a8794a"}"/>
        <circle cx="${size * 2.3}" cy="${-size * 1.6}" r="${size * .45}" fill="${dead ? "var(--red)" : m.color || "#a8794a"}"/>
        <path d="M ${-size * 1.5} 0 Q ${-size * 2.3} ${size * .4} ${-size * 2.1} ${size * .9}" stroke="${dead ? "var(--red)" : "#7a5a3a"}" stroke-width="1.4" fill="none"/>
        <line x1="${-size * .9}" y1="${size * .7}" x2="${-size * 1.1}" y2="${size * 1.9}" stroke="#5a4632" stroke-width="1.3"/>
        <line x1="${size * .9}" y1="${size * .7}" x2="${size * 1.1}" y2="${size * 1.9}" stroke="#5a4632" stroke-width="1.3"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sp-wrap">
        <div class="sp-head"><b>STEPPE</b><span>浪=配额窗 高=用量 马=会话${hotN ? " · " + hotN + " 浪风" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #201c12 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c9b06a" opacity=".4"/>
          ${swells}${herd}
          <g class="sp-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sp-k">${fmt(k.tokens)} · ${sessions.length} 马</text>
            <text x="22" y="45" class="sp-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草原", eyebrow: "STEPPE", render };
})();
