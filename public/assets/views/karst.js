/* -------------------------------------------------------------------- karst
 * Karst — limestone towers in a river mist: every quota window is a
 * karst tower whose height = used % (≥85% the cap wears a red flag);
 * sessions are macaques leaping between peaks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "karst";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // river mist
    let mist = "";
    for (let i = 0; i < 4; i++) {
      mist += `<ellipse cx="${(60 + i * 110).toFixed(1)}" cy="${(GY - 10 - i * 14).toFixed(1)}" rx="${(38 + i * 10).toFixed(1)}" ry="${(5 + i).toFixed(1)}" fill="#c8d8d0" opacity="${(.05 + i * .04).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(i % 2 ? -8 : 8)} 0;0 0" dur="${(9 + i * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }

    // river
    const river = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a3a44 62%, var(--card-2))"/>
      <path d="M 0 ${GY} Q 100 ${GY - 2} 200 ${GY} T 400 ${GY}" stroke="#5a9ab8" stroke-width=".8" fill="none" opacity=".3"/>`;

    // karst towers — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const towers = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a8a7a";
      const th = 40 + f * 130;
      const tw = 10 + f * 14;
      const tipY = GY - th;
      // tower body — stepped limestone
      const steps = Math.round(2 + f * 3);
      let body = "";
      for (let s = 0; s < steps; s++) {
        const t = s / Math.max(1, steps - 1);
        const y0 = GY - t * (th - 20);
        const y1 = y0 - (th - 20) / steps;
        const sw = tw * (1 - t * .4);
        body += `<path d="M ${cx - sw} ${y0} L ${cx - sw * .8} ${y1} L ${cx + sw * .8} ${y1} L ${cx + sw} ${y0} Z" fill="color-mix(in srgb, ${col} ${50 + f * 30}%, #3a4a44)" opacity="${(.6 + t * .3).toFixed(2)}"/>`;
      }
      // cap — vegetation on top
      const cap = `<ellipse cx="${cx}" cy="${tipY}" rx="${tw * .9}" ry="${(5 + f * 4).toFixed(1)}" fill="${hot ? "var(--amber)" : "#4a7a4a"}" opacity=".85"/>`;
      // flag when hot
      const flag = hot ? `<path d="M ${cx + tw * .3} ${tipY - 8} L ${cx + tw * .3} ${tipY - 20} L ${cx + tw * 1.2} ${tipY - 16} Z" fill="var(--red)">
        <animateTransform attributeName="transform" type="rotate" values="0 ${cx + tw * .3} ${tipY - 20};-8 ${cx + tw * .3} ${tipY - 20};0 ${cx + tw * .3} ${tipY - 20}" dur="1.2s" repeatCount="indefinite"/></path>` : "";
      return `<g class="kr-tower${hot ? " hot" : ""}">
        ${body}${cap}${flag}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="kr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="kr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // macaques — sessions leaping between peaks
    const monkeys = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x1 = 50 + i * 70 + rnd() * 20;
      const x2 = x1 + 60 + rnd() * 30;
      const y = GY - 30 - (i % 2) * 20;
      const size = 4 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a87848");
      const dur = Math.max(4, 10 - (s.tps || 0) / 16);
      return `<g class="kr-monkey${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x1.toFixed(1)} ${y};${((x1 + x2) / 2).toFixed(1)} ${(y - 34).toFixed(1)};${x2.toFixed(1)} ${y}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .9}" fill="${col}"/>
        <circle cx="${size * 1.2}" cy="${-size * .5}" r="${size * .55}" fill="${col}"/>
        <circle cx="${size * 1.35}" cy="${-size * .55}" r="${size * .18}" fill="#2a1a10"/>
        <path d="M ${-size * .8} ${size * .5} Q ${-size * 2} ${size * .8} ${-size * 2.4} ${-size * .2}" stroke="${col}" stroke-width="1.4" fill="none"/>
        <ellipse cx="${-size * .6}" cy="${size * .8}" rx="${size * .5}" ry="${size * .3}" fill="${col}"/>
        <ellipse cx="${size * .7}" cy="${size * .8}" rx="${size * .5}" ry="${size * .3}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="kr-wrap">
        <div class="kr-head"><b>KARST</b><span>峰=配额窗 高=用量 猴=会话${hotN ? " · " + hotN + " 红旗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14181c 50%, transparent)" rx="10"/>
          ${river}${mist}${towers}${monkeys}
          <g class="kr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="kr-k">${fmt(k.tokens)} · ${sessions.length} 猴</text>
            <text x="22" y="45" class="kr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "喀斯特", eyebrow: "KARST", render };
})();
