/* -------------------------------------------------------------------- forest
 * Forest — a woodland edge: every quota window is a tree whose height
 * rises as used % climbs (≥85% the trunk leans and sheds leaves);
 * sessions are birds flitting between the canopies.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "forest";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55190377);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 240;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // trees — trunk grows with used %, leans when over quota
    const trees = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hgt = 40 + f * 130;
      const lean = f * 8;
      const col = m.color || "#6a9a4a";
      // canopy blob layers
      const canR = 16 + f * 12;
      const can = `
        <ellipse cx="${(cx + lean * .5).toFixed(1)}" cy="${(FLOOR - hgt + canR * .4).toFixed(1)}" rx="${canR.toFixed(1)}" ry="${(canR * .8).toFixed(1)}"
          fill="color-mix(in srgb, ${col} ${40 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        <ellipse cx="${(cx + lean * .5 - canR * .5).toFixed(1)}" cy="${(FLOOR - hgt + canR * .8).toFixed(1)}" rx="${(canR * .7).toFixed(1)}" ry="${(canR * .55).toFixed(1)}"
          fill="color-mix(in srgb, ${col} ${30 + f * 20}%, var(--card-2))" opacity=".8"/>
        <ellipse cx="${(cx + lean * .5 + canR * .5).toFixed(1)}" cy="${(FLOOR - hgt + canR * .85).toFixed(1)}" rx="${(canR * .65).toFixed(1)}" ry="${(canR * .5).toFixed(1)}"
          fill="color-mix(in srgb, ${col} ${26 + f * 16}%, var(--card-2))" opacity=".7"/>`;
      const trunk = `<path d="M ${cx.toFixed(1)} ${FLOOR} Q ${(cx + lean * .5).toFixed(1)} ${(FLOOR - hgt * .6).toFixed(1)} ${(cx + lean).toFixed(1)} ${(FLOOR - hgt + canR * .7).toFixed(1)}" stroke="#5a4632" stroke-width="${(3 + f * 3).toFixed(1)}" fill="none"/>`;
      // falling leaves on hot trees
      const leaves = hot ? Array.from({ length: 3 }, (_, k) =>
        `<ellipse cx="${(cx + lean * .5 + (k - 1) * canR * .4).toFixed(1)}" cy="${(FLOOR - hgt + canR * .5).toFixed(1)}" rx="2" ry="3" fill="var(--red)">
          <animate attributeName="cy" values="${(FLOOR - hgt + canR * .5).toFixed(1)};${FLOOR - 3}" dur="${(2 + k * .5).toFixed(1)}s" begin="${(-k * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(2 + k * .5).toFixed(1)}s" begin="${(-k * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="rotate" values="0 ${cx.toFixed(1)} ${FLOOR - hgt};25 ${cx.toFixed(1)} ${FLOOR - hgt};0 ${cx.toFixed(1)} ${FLOOR - hgt}" dur="2s" repeatCount="indefinite"/>
        </ellipse>`).join("") : "";
      return `<g class="fr-tree${hot ? " hot" : ""}">
        ${trunk}${can}${leaves}
        <text x="${cx.toFixed(1)}" y="${FLOOR + 18}" class="fr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${FLOOR + 29}" class="fr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // birds — sessions flitting between canopies
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 8);
      const y = 60 + (i % 4) * 24 + rnd() * 10;
      const size = 4 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="fr-bird${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * 2.4).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M -${size} 0 Q -${size * .5} -${size * .8} 0 0 Q ${size * .5} -${size * .8} ${size} 0" fill="none" stroke="${dead ? "var(--red)" : m.color || "#b5c9d8"}" stroke-width="1.5" stroke-linecap="round">
          <animate attributeName="d" values="M -${size} 0 Q -${size * .5} -${size * .8} 0 0 Q ${size * .5} -${size * .8} ${size} 0;M -${size} -1 Q -${size * .5} ${size * .6} 0 -1 Q ${size * .5} ${size * .6} ${size} -1;M -${size} 0 Q -${size * .5} -${size * .8} 0 0 Q ${size * .5} -${size * .8} ${size} 0" dur="${(0.7 + i * .1).toFixed(1)}s" repeatCount="indefinite"/>
        </path>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fr-wrap">
        <div class="fr-head"><b>FOREST</b><span>树=配额窗 高=用量 鸟=会话${hotN ? " · " + hotN + " 树落叶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14201a 40%, transparent)" rx="10"/>
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#4a3a28" opacity=".9"/>
          ${trees}${birds}
          <g class="fr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fr-k">${fmt(k.tokens)} · ${sessions.length} 鸟</text>
            <text x="22" y="45" class="fr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "森林", eyebrow: "FOREST", render };
})();
