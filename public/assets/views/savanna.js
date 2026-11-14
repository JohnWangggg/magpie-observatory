/* ------------------------------------------------------------------ savanna
 * Savanna — golden grass under an acacia sky: every quota window
 * is an acacia whose canopy width = used % (≥85% the crown burns
 * amber); sessions are wildebeest migrating across the plain.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "savanna";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 216;

    // golden sky
    const sky = `<defs><linearGradient id="sv-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8a860"/><stop offset="100%" stop-color="#e8d8b0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sv-s)" rx="10"/>`;
    // dry grass
    let grass = "";
    for (let i = 0; i < 25; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 15).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + 8 + rnd() * 15).toFixed(1)}" stroke="#8a7a4a" stroke-width="${(.5 + rnd() * 1).toFixed(1)}" opacity="${(.15 + rnd() * .2).toFixed(2)}"/>`;
    }
    // horizon
    const horizon = `<line x1="0" y1="${GY}" x2="${W}" y2="${GY}" stroke="#a89060" stroke-width=".8" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b0a080 60%, var(--card-2))"/>`;

    // acacias — canopy width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const trees = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a6a3a";
      const th = 30 + f * 80;
      const cw = 15 + f * 35;
      const cy2 = GY - th;
      // trunk — forked
      const trunk = `<path d="M ${cx} ${GY} L ${cx - 3} ${GY - th * .4} L ${cx - 8} ${cy2 + 10} M ${cx} ${GY} L ${cx + 3} ${GY - th * .4} L ${cx + 8} ${cy2 + 10} M ${cx} ${GY - th * .4} L ${cx} ${cy2 + 5}" stroke="#5a4a30" stroke-width="${(2 + f * 3).toFixed(1)}" fill="none"/>`;
      // flat canopy
      const canopy = `<ellipse cx="${cx}" cy="${cy2}" rx="${cw}" ry="${(cw * .3).toFixed(1)}" fill="color-mix(in srgb, ${col} 60%, #6a7a4a)" opacity=".85"/>`;
      // hot amber crown
      const crown = hot ? `<ellipse cx="${cx}" cy="${cy2 - 5}" rx="${cw * .8}" ry="${cw * .2}" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${cw * .8};${cw}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${cw * .2};${cw * .3}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="sv-tree${hot ? " hot" : ""}">
        ${trunk}${canopy}${crown}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="sv-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="sv-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // wildebeest — sessions migrating left-to-right
    const beasts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY + 25 + (i % 2) * 10;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#4a3a2a");
      return `<g class="sv-beast${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .6}" fill="${col}"/>
        <ellipse cx="${size * 1.2}" cy="${-size * .2}" rx="${size * .4}" ry="${size * .35}" fill="${col}"/>
        <path d="M ${size * 1.4} ${-size * .3} L ${size * 1.6} ${-size * .8}" stroke="${col}" stroke-width=".8" fill="none"/>
        <ellipse cx="${-size * .8}" cy="${size * .1}" rx="${size * .3}" ry="${size * .2}" fill="${col}" opacity=".5"/>
        <path d="M ${-size * 1.4} 0 L ${-size * 1.8} ${size * .4}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sv-wrap">
        <div class="sv-head"><b>SAVANNA</b><span>金合欢=配额窗 冠宽=用量 角马=会话${hotN ? " · " + hotN + " 燃冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${ground}${grass}${horizon}${trees}${beasts}
          <g class="sv-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sv-k">${fmt(k.tokens)} · ${sessions.length} 角马</text>
            <text x="22" y="45" class="sv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草原", eyebrow: "SAVANNA", render };
})();
