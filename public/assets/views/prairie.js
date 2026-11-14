/* ------------------------------------------------------------------- prairie
 * Prairie — tallgrass under a big sky: every quota window is a
 * seed-head clump whose flower count = used % (≥85% the clump
 * goes seed-dry amber); sessions are pronghorns bounding
 * between the clumps.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "prairie";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(86420973);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 234;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // big-sky clouds drifting
    let clouds = "";
    for (let i = 0; i < 3; i++) {
      clouds += `<ellipse cx="${60 + i * 140}" cy="${42 + i * 18}" rx="${34 + i * 10}" ry="${8 + i * 2}" fill="#dfe8f0" opacity="${.1 + i * .04}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(i % 2 ? -8 : 8)} 0;0 0" dur="${(8 + i * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }

    // clumps — seed-head count = used %
    const clumps = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = hot ? "var(--amber)" : (m.color || "#a8b05a");
      const stems = 3 + Math.round(f * 8);
      let heads = "";
      for (let b = 0; b < stems; b++) {
        const bx = cx - gap * .28 + rnd() * gap * .56;
        const bh = 14 + f * 62 + rnd() * 18;
        heads += `<path d="M ${bx.toFixed(1)} ${GY} Q ${(bx + (rnd() - .5) * 8).toFixed(1)} ${(GY - bh * .55).toFixed(1)} ${(bx + (rnd() - .5) * 12).toFixed(1)} ${(GY - bh).toFixed(1)}" stroke="#5a7a3a" stroke-width=".9" fill="none" opacity=".8"/>`;
        // seed head — puffy on tall stems
        if (bh > 26) {
          heads += `<ellipse cx="${(bx + (rnd() - .5) * 12).toFixed(1)}" cy="${(GY - bh).toFixed(1)}" rx="${(2 + f * 1.5).toFixed(1)}" ry="${(3 + f * 2).toFixed(1)}" fill="${col}" opacity="${(0.5 + f * .35).toFixed(2)}"/>`;
        }
      }
      const base = `<ellipse cx="${cx}" cy="${GY}" rx="${(gap * .32).toFixed(1)}" ry="4" fill="color-mix(in srgb, #5a7a3a 50%, var(--card-2))"/>`;
      return `<g class="pr-clump${hot ? " hot" : ""}">
        ${base}${heads}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="pr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="pr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pronghorns — sessions bounding
    const herd = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 16 - (s.tps || 0) / 10);
      const y = GY - 8 - (i % 3) * 14;
      const size = 4 + Math.min(4, (s.tokens || 0) / 50000);
      return `<g class="pr-prong${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y.toFixed(1)};${W + 26} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.4).toFixed(1)}s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 ${-size * 1.4};0 0" dur=".55s" begin="${(-i * .35).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .85}" fill="${dead ? "var(--red)" : m.color || "#c9a06a"}"/>
        <path d="M ${size * 1.2} ${-size * .5} L ${size * 1.9} ${-size * 1.4} L ${size * 2.4} ${-size * 1.1} L ${size * 1.8} 0 Z" fill="${dead ? "var(--red)" : m.color || "#c9a06a"}"/>
        <circle cx="${size * 2.2}" cy="${-size * 1.2}" r="${size * .42}" fill="${dead ? "var(--red)" : m.color || "#c9a06a"}"/>
        <path d="M ${size * 2.2} ${-size * 1.5} L ${size * 2.3} ${-size * 2.2} M ${size * 2.2} ${-size * 1.5} L ${size * 2.6} ${-size * 2}" stroke="#4a3a26" stroke-width="1"/>
        <ellipse cx="${-size * .9}" cy="0" rx="${size * .4}" ry="${size * .5}" fill="#f0e8d8" opacity=".9"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * .8}" y2="${size * 1.8}" stroke="#7a5a3a" stroke-width="1.2"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * .8}" y2="${size * 1.8}" stroke="#7a5a3a" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pr-wrap">
        <div class="pr-head"><b>PRAIRIE</b><span>丛=配额窗 穗=用量 羚=会话${hotN ? " · " + hotN + " 丛枯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c2014 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#a8a05a" opacity=".4"/>
          ${clouds}${clumps}${herd}
          <g class="pr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pr-k">${fmt(k.tokens)} · ${sessions.length} 羚</text>
            <text x="22" y="45" class="pr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "大草原", eyebrow: "PRAIRIE", render };
})();
