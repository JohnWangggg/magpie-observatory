/* -------------------------------------------------------------------- dune
 * Dune sea — layered sand ridges at golden hour: every quota window
 * is a dune whose crest height = used % (≥85% the ridge glows
 * ember-red); sessions are sand-skiffs sailing between the dunes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dune";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(97761151);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // heat shimmer lines in the sky
    let shimmer = "";
    for (let i = 0; i < 5; i++) {
      const sy = 40 + i * 22;
      shimmer += `<path d="M 0 ${sy} q 50 ${3 + i} 100 0 t 100 0 t 100 0 t 100 0" fill="none" stroke="#e8c98a" stroke-width=".7" opacity="${.06 + i * .02}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${i % 2 ? 6 : -6} 0;0 0" dur="${(6 + i * 1.5).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    }

    // dunes — crest = used %
    const dunes = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d9a05a";
      const dh = 30 + f * 110;
      const dw = gap * .55;
      // windward (lit) + leeward (dark) slopes
      const crest = `M ${cx - dw} ${GY} Q ${cx - dw * .35} ${GY - dh * .6} ${cx} ${GY - dh}
        Q ${cx + dw * .3} ${GY - dh * .75} ${cx + dw * .65} ${GY} Z`;
      const dark = `M ${cx} ${GY - dh} Q ${cx + dw * .3} ${GY - dh * .75} ${cx + dw * .65} ${GY}
        L ${cx + dw} ${GY} Q ${cx + dw * .5} ${GY - dh * .55} ${cx} ${GY - dh} Z`;
      // ember glow on hot dunes
      const ember = hot ? `<path d="M ${cx - dw * .3} ${GY - dh * .8} Q ${cx} ${GY - dh * 1.05} ${cx + dw * .25} ${GY - dh * .8}"
        fill="none" stroke="var(--red)" stroke-width="2" opacity=".7">
        <animate attributeName="opacity" values=".3;.8;.3" dur="1.8s" repeatCount="indefinite"/></path>` : "";
      return `<g class="du-dune${hot ? " hot" : ""}">
        <path d="${dark}" fill="color-mix(in srgb, ${col} 20%, #3a2a18)" opacity=".85"/>
        <path d="${crest}" fill="color-mix(in srgb, ${col} ${35 + f * 35}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        ${ember}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="du-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="du-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sand-skiffs — sessions sailing between dunes
    const skiffs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(10, 22 - (s.tps || 0) / 8);
      const y = GY - 8 - (i % 3) * 14;
      const size = 3.5 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="du-skiff${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y.toFixed(1)};${W + 26} ${(y + 5).toFixed(1)}" dur="${dur}s" begin="${(-i * 3.2).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size * 1.6} 0 Q 0 ${size * .9} ${size * 1.6} 0 L ${size * 1.4} ${-size * .4} L ${-size * 1.4} ${-size * .4} Z"
          fill="${dead ? "var(--red)" : m.color || "#b8794a"}"/>
        <line x1="0" y1="0" x2="0" y2="${-size * 1.9}" stroke="#6a4a2a" stroke-width="1.2"/>
        <path d="M 0 ${-size * 1.9} L ${size * 1.5} ${-size * .5} L 0 ${-size * .5} Z" fill="#e8d9a8" opacity=".85"/>
        <line x1="${-size * .7}" y1="${size * .7}" x2="${-size * .7}" y2="${size * 1.6}" stroke="#4a3a26" stroke-width="1"/>
        <line x1="${size * .7}" y1="${size * .7}" x2="${size * .7}" y2="${size * 1.6}" stroke="#4a3a26" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="du-wrap">
        <div class="du-head"><b>DUNE SEA</b><span>丘=配额窗 脊=用量 舟=会话${hotN ? " · " + hotN + " 丘燃" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #241a10 46%, transparent)" rx="10"/>
          ${shimmer}${dunes}${skiffs}
          <g class="du-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="du-k">${fmt(k.tokens)} · ${sessions.length} 舟</text>
            <text x="22" y="45" class="du-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沙丘海", eyebrow: "DUNE", render };
})();
