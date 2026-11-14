/* ------------------------------------------------------------------ nunataks
 * Nunataks — rocky peaks poking through the ice sheet: every
 * quota window is a nunatak whose exposed height = used %
 * (≥85% the wind-blown plume burns amber); sessions are
 * snow buntings hopping on the crust.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "nunataks";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(26326688);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // white-out sky
    const sky = `<defs><linearGradient id="nu-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8d4dc"/><stop offset="100%" stop-color="#e0e8ec"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#nu-s)" rx="10"/>`;
    // ice sheet — flat, featureless
    const sheet = `<path d="M 0 ${GY} Q 100 ${GY - 15} 200 ${GY - 10} Q 300 ${GY - 18} 400 ${GY - 12} L 400 ${H} L 0 ${H} Z" fill="#dce8ec"/>`;
    // sastrugi — wind ridges
    let sastrugi = "";
    for (let i = 0; i < 10; i++) {
      sastrugi += `<path d="M ${(rnd() * W).toFixed(1)} ${(GY + 5 + rnd() * 40).toFixed(1)} q 15 ${(rnd() * 3 - 1).toFixed(1)} 30 ${(rnd() * 2 - 1).toFixed(1)}" stroke="#c0d0d8" stroke-width=".8" fill="none" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }

    // nunataks — exposed height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const peaks = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#687078";
      const ph = 15 + f * 80;
      const pw = 12 + f * 20;
      const topY = GY - ph;
      // jagged rock poking out
      const peak = `<path d="M ${cx - pw / 2} ${GY} L ${cx - pw * .3} ${topY + 12} L ${cx - pw * .05} ${topY} L ${cx + pw * .2} ${topY + 8} L ${cx + pw * .4} ${topY + 15} L ${cx + pw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 65%, #505860)"/>`;
      // ice apron at the base
      const apron = `<ellipse cx="${cx}" cy="${GY - 3}" rx="${pw * .7}" ry="4" fill="#dce8ec" opacity=".8"/>`;
      // wind plume off the summit
      const plume = `<path d="M ${cx} ${topY + 2} Q ${cx + pw * .8} ${topY - 4} ${cx + pw * 1.6} ${topY + 2}" stroke="${hot ? "var(--amber)" : "#d0e0e8"}" stroke-width="${(1.5 + f).toFixed(1)}" fill="none" opacity="${hot ? ".7" : ".5"}" stroke-linecap="round">
        <animate attributeName="d" values="M ${cx} ${topY + 2} Q ${cx + pw * .8} ${topY - 4} ${cx + pw * 1.6} ${topY + 2};M ${cx} ${topY + 2} Q ${cx + pw * .8} ${topY - 8} ${cx + pw * 1.7} ${topY - 2};M ${cx} ${topY + 2} Q ${cx + pw * .8} ${topY - 4} ${cx + pw * 1.6} ${topY + 2}" dur="${(2 + i * .3).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      const glow = hot ? `<circle cx="${cx}" cy="${topY + 4}" r="${(4 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="${(4 + f * 3).toFixed(1)};${(7 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="nu-peak${hot ? " hot" : ""}">
        ${peak}${apron}${plume}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="nu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="nu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // snow buntings — hopping on the crust
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY + 15 + (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      const x0 = -15;
      const x1 = W + 15;
      return `<g class="nu-bunt${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x0} ${y};${x1} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .25}" r="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .7} ${size * .1} L ${-size * 1.2} ${-size * .2} L ${-size * 1.2} ${size * .4} Z" fill="${col}"/>
        <path d="M ${-size * .2} ${-size * .3} L ${-size * .8} ${-size * .7}" stroke="${col}" stroke-width=".5" fill="none" opacity=".7"/>
        <line x1="0" y1="${size * .4}" x2="0" y2="${size * 1}" stroke="#585858" stroke-width=".3"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="nu-wrap">
        <div class="nu-head"><b>NUNATAKS</b><span>岛峰=配额窗 露高=用量 雪鹀=会话${hotN ? " · " + hotN + " 燃旗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sheet}${sastrugi}${peaks}${birds}
          <g class="nu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="nu-k">${fmt(k.tokens)} · ${sessions.length} 鹀</text>
            <text x="22" y="45" class="nu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "岛峰", eyebrow: "NUNATAKS", render };
})();
