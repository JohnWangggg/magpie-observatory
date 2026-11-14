/* ------------------------------------------------------------------ buttes
 * Buttes — lone flat-topped sentinels on the prairie: every
 * quota window is a butte whose caprock width = used %
 * (≥85% the fire lookout on top burns amber); sessions are
 * pronghorns ghosting past.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "buttes";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(36326687);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // big prairie sky
    const sky = `<defs><linearGradient id="bu-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8b888"/><stop offset="100%" stop-color="#e8d0a8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bu-s)" rx="10"/>`;
    // heat shimmer band
    const shimmer = `<rect x="0" y="${GY - 30}" width="${W}" height="30" fill="#e0c090" opacity=".4"/>`;
    // prairie
    const prairie = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c8a860 55%, var(--card-2))"/>`;
    // grass tufts
    let grass = "";
    for (let i = 0; i < 14; i++) {
      const gx = rnd() * W, gy = GY + 4 + rnd() * 35;
      grass += `<path d="M ${gx.toFixed(1)} ${gy.toFixed(1)} l -2 -6 M ${gx.toFixed(1)} ${gy.toFixed(1)} l 0 -7 M ${gx.toFixed(1)} ${gy.toFixed(1)} l 2 -6" stroke="#a08848" stroke-width=".8" fill="none" opacity="${(.5 + rnd() * .2).toFixed(2)}"/>`;
    }

    // buttes — caprock width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const sentinels = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b07848";
      const cw = 12 + f * 26;
      const bh = 40 + f * 30;
      const topY = GY - bh;
      // butte — vertical sides, flat cap
      const butte = `<path d="M ${cx - cw / 2} ${topY} L ${cx - cw * .4} ${GY} L ${cx + cw * .4} ${GY} L ${cx + cw / 2} ${topY} Z" fill="color-mix(in srgb, ${col} 65%, #985838)"/>`;
      // caprock — the resistant top layer
      const cap = `<rect x="${cx - cw / 2 - 2}" y="${topY - 4}" width="${cw + 4}" height="4" fill="color-mix(in srgb, ${col} 80%, #784828)"/>`;
      // talus skirt
      const talus = `<path d="M ${cx - cw * .4} ${GY} L ${cx - cw * .7} ${GY + 8} L ${cx + cw * .7} ${GY + 8} L ${cx + cw * .4} ${GY} Z" fill="#a87848" opacity=".6"/>`;
      // strata
      const strata = `<path d="M ${cx - cw * .45} ${topY + bh * .3} L ${cx + cw * .45} ${topY + bh * .3} M ${cx - cw * .42} ${topY + bh * .6} L ${cx + cw * .42} ${topY + bh * .6}" stroke="#683818" stroke-width=".8" opacity=".5"/>`;
      // fire lookout tower on the cap
      const lookout = `<rect x="${cx - 3}" y="${topY - 12}" width="6" height="8" fill="${hot ? "var(--amber)" : "#e8d8b8"}"/>
        <line x1="${cx - 2}" y1="${topY - 4}" x2="${cx - 2}" y2="${topY}" stroke="#986838" stroke-width=".8"/>
        <line x1="${cx + 2}" y1="${topY - 4}" x2="${cx + 2}" y2="${topY}" stroke="#986838" stroke-width=".8"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${topY - 8}" r="8" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="8;12" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="bu-butte${hot ? " hot" : ""}">
        ${butte}${cap}${talus}${strata}${lookout}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 24}" class="bu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 34}" class="bu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pronghorns — ghosting past
    const pronghorns = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 11 - (s.tps || 0) / 14);
      const y = GY + 10 + (i % 3) * 10;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8a878");
      return `<g class="bu-prong${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.1}" ry="${size * .55}" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .4}" r="${size * .35}" fill="${col}"/>
        <path d="M ${size * .8} ${-size * .65} L ${size * .7} ${-size * 1.2} M ${size * 1} ${-size * .65} L ${size * 1.1} ${-size * 1.2}" stroke="#483018" stroke-width=".9" fill="none" stroke-linecap="round"/>
        <path d="M ${-size * .9} ${size * .2} Q ${-size * 1.3} ${size * .5} ${-size * 1.4} ${size * .2}" stroke="${col}" stroke-width=".8" fill="none"/>
        <line x1="${size * .6}" y1="${size * .4}" x2="${size * .6}" y2="${size * 1.2}" stroke="${col}" stroke-width=".7"/>
        <line x1="${-size * .6}" y1="${size * .4}" x2="${-size * .6}" y2="${size * 1.2}" stroke="${col}" stroke-width=".7"/>
        <ellipse cx="${-size * .2}" cy="${size * .55}" rx="${size * .35}" ry="${size * .18}" fill="#f0e8d8" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bu-wrap">
        <div class="bu-head"><b>BUTTES</b><span>孤丘=配额窗 帽岩宽=用量 叉角羚=会话${hotN ? " · " + hotN + " 燃望楼" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${shimmer}${prairie}${grass}${sentinels}${pronghorns}
          <g class="bu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bu-k">${fmt(k.tokens)} · ${sessions.length} 羚</text>
            <text x="22" y="45" class="bu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "孤丘", eyebrow: "BUTTES", render };
})();
