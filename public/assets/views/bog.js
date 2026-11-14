/* ---------------------------------------------------------------------- bog
 * Bog — pitcher plants in a quaking mire: every quota window is a
 * pitcher plant whose trumpet height = used % (≥85% the lip rims
 * red and drool beads); sessions are frogs leaping between hummocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bog";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66699911);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // quaking mire — spongy ground
    const mire = `<path d="M 0 ${GY} Q 60 ${GY - 8} 140 ${GY - 2} T 280 ${GY - 6} T 400 ${GY} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #1a2014 72%, var(--card-2))"/>`;
    // sphagnum moss clumps
    let sphag = "";
    for (let i = 0; i < 8; i++) {
      const sx = 30 + i * 48 + rnd() * 14;
      sphag += `<ellipse cx="${sx.toFixed(1)}" cy="${(GY + 4 + rnd() * 14).toFixed(1)}" rx="${(6 + rnd() * 8).toFixed(1)}" ry="${(2 + rnd() * 2).toFixed(1)}" fill="color-mix(in srgb, #5a8a3a ${40 + rnd() * 30}%, transparent)"/>`;
    }

    // pitcher plants — trumpet height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const plants = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a8a5a";
      const ph = 30 + f * 90;
      const pw = 8 + f * 10;
      const tipY = GY - ph;
      // trumpet body — flared tube
      const tube = `<path d="M ${cx - pw * .4} ${GY} Q ${cx - pw * .5} ${GY - ph * .5} ${cx - pw} ${tipY + 14} L ${cx - pw * .7} ${tipY} Q ${cx} ${tipY - 6} ${cx + pw * .7} ${tipY} L ${cx + pw} ${tipY + 14} Q ${cx + pw * .5} ${GY - ph * .5} ${cx + pw * .4} ${GY} Z" fill="color-mix(in srgb, ${col} ${50 + f * 40}%, #2a3a1a)" stroke="${hot ? "var(--red)" : "color-mix(in srgb, " + col + " 60%, #1a2a10)"}" stroke-width="1"/>`;
      // lip — flared rim
      const lip = `<ellipse cx="${cx}" cy="${tipY}" rx="${pw * .9}" ry="${(3 + f * 3).toFixed(1)}" fill="${hot ? "color-mix(in srgb, var(--red) 60%, " + col + ")" : "color-mix(in srgb, " + col + " 70%, #e8d0a0)"}" opacity=".9"/>`;
      // drool bead at lip when hot
      const drool = hot ? `<circle cx="${cx + pw * .6}" cy="${tipY + 4}" r="${(1.5 + f).toFixed(1)}" fill="var(--amber)" opacity=".85">
        <animate attributeName="cy" values="${tipY + 4};${tipY + 16}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".85;0" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      // operculum — lid over the lip
      const lid = `<path d="M ${cx - pw * .8} ${tipY - 4} Q ${cx} ${tipY - 14 - f * 6} ${cx + pw * .8} ${tipY - 4} Q ${cx} ${tipY - 8} ${cx - pw * .8} ${tipY - 4} Z" fill="${hot ? "color-mix(in srgb, var(--red) 40%, " + col + ")" : col}" opacity=".8"/>`;
      // tendril from lid
      const tend = `<path d="M ${cx} ${tipY - 12} Q ${cx + pw * 1.6} ${tipY - 26} ${cx + pw * 2.2} ${tipY - 20}" stroke="${col}" stroke-width="1" fill="none" opacity=".6"/>`;
      return `<g class="bg-plant${hot ? " hot" : ""}">
        ${tube}${lip}${lid}${tend}${drool}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="bg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="bg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // frogs — sessions leaping between hummocks
    const frogs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const fy = GY - 6 - (i % 2) * 10;
      const dur = Math.max(6, 15 - (s.tps || 0) / 10);
      const size = 3.5 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#5aa84a");
      // hopping parabola
      const h1x = 30 + i * 70 + rnd() * 20;
      const h2x = h1x + 60 + rnd() * 40;
      return `<g class="bg-frog${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${h1x.toFixed(1)} ${fy.toFixed(1)};${((h1x + h2x) / 2).toFixed(1)} ${(fy - 30 - rnd() * 16).toFixed(1)};${h2x.toFixed(1)} ${fy.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .9}" fill="${col}"/>
        <circle cx="${size * 1.2}" cy="${-size * .4}" r="${size * .5}" fill="${col}"/>
        <circle cx="${size * 1.2}" cy="${-size * .5}" r="${size * .22}" fill="#1a1a1a"/>
        <ellipse cx="${-size * .6}" cy="${size * .7}" rx="${size * .8}" ry="${size * .3}" fill="${col}"/>
        <ellipse cx="${size * .7}" cy="${size * .7}" rx="${size * .8}" ry="${size * .3}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bg-wrap">
        <div class="bg-head"><b>BOG</b><span>捕虫笼=配额窗 高=用量 蛙=会话${hotN ? " · " + hotN + " 口红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #10160e 58%, transparent)" rx="10"/>
          ${mire}${sphag}${plants}${frogs}
          <g class="bg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bg-k">${fmt(k.tokens)} · ${sessions.length} 蛙</text>
            <text x="22" y="45" class="bg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酸沼", eyebrow: "BOG", render };
})();
