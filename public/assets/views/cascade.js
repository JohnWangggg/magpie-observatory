/* -------------------------------------------------------------------- cascade
 * Cascade — a stepped waterfall: every model is a ledge whose width
 * = its share of today's tokens; water pours down each step.
 * Sessions are droplets riding the falls. Biggest model on top.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cascade";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(2718281);

  function render(host, ctx) {
    const models = ((ctx.data && ctx.data.models) || []).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const top = 50, stepH = 30, ledgeX = 60, ledgeWMax = 290;

    if (!models.length) {
      host.innerHTML = `<div class="cs-wrap"><div class="cs-head"><b>CASCADE</b><span>等待 models 数据</span></div>
        <div class="cs-empty">暂无模型用量 · 切到实时或等待 demo tick</div></div>`;
      return;
    }

    const totalTok = models.reduce((a, m) => a + m.tokens, 0);

    // ledges — width = share
    const ledges = models.map((m, i) => {
      const y = top + i * stepH;
      const w = Math.max(46, ledgeWMax * (m.tokens / totalTok));
      const x = ledgeX + (ledgeWMax - w) / 2;
      const pm = metaOf(pmeta, m.provider);
      const col = pm.color || "#5a9ab8";
      // falling water sheet off each ledge
      const fall = i < models.length - 1
        ? `<rect x="${x + w * .1}" y="${y + 10}" width="${w * .8}" height="${stepH - 10}" fill="color-mix(in srgb, #7ac9e8 30%, transparent)" opacity=".6">
            <animate attributeName="opacity" values=".4;.7;.4" dur="${(1.2 + i * .3).toFixed(1)}s" repeatCount="indefinite"/></rect>` : "";
      // mist at base
      const mist = `<ellipse cx="${x + w / 2}" cy="${y + 9}" rx="${w * .35}" ry="3" fill="#bfe5f0" opacity=".2"/>`;
      return `<g class="cs-ledge">
        ${fall}
        <rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="10" rx="3"
          fill="color-mix(in srgb, ${col} ${30 + m.share * .5}%, var(--card-2))" stroke="${col}" stroke-width="1"/>
        ${mist}
        <text x="${(x + 8).toFixed(1)}" y="${y + 7.5}" class="cs-mname">${esc(m.name.slice(0, 20))}</text>
        <text x="${(x + w - 6).toFixed(1)}" y="${y + 7.5}" class="cs-pct" text-anchor="end">${m.share}%</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${y + 22}" class="cs-tok" text-anchor="middle">${ctx.fmtTokens(m.tokens)}</text>
      </g>`;
    }).join("");

    // droplets — sessions riding the falls
    const drops = sessions.map((s, i) => {
      const dead = s.status === "err";
      const dur = Math.max(1.6, 4 - (s.tps || 0) / 60);
      const x = ledgeX + ledgeWMax * (.15 + (i / Math.max(1, sessions.length)) * .7);
      const size = 2.5 + Math.min(2.5, (s.tokens || 0) / 60000);
      return `<g class="cs-drop${dead ? " dead" : ""}">
        <circle cx="${x.toFixed(1)}" r="${size.toFixed(1)}" fill="${dead ? "var(--red)" : "#a8e0f5"}">
          <animate attributeName="cy" values="${top + 4};${top + models.length * stepH - 4}" dur="${dur}s" begin="${(-i * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;1;0" dur="${dur}s" begin="${(-i * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 16} 0" dur="${dur}s" begin="${(-i * .7).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");

    host.innerHTML = `
      <div class="cs-wrap">
        <div class="cs-head"><b>CASCADE</b><span>级=模型 宽=份额 滴=会话</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14202a 46%, transparent)" rx="10"/>
          ${ledges}${drops}
          <g class="cs-card">
            <rect x="14" y="252" width="150" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)" opacity=".92"/>
            <text x="22" y="270" class="cs-k">${fmt(k.tokens)} · ${models.length} 模型</text>
            <text x="22" y="283" class="cs-ksub">今日 tokens · top=${esc(models[0].name.slice(0, 12))}</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "阶瀑", eyebrow: "CASCADE", render };
})();
