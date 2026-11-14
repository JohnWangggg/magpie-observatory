/* ------------------------------------------------------------------ towers
 * Towers — fortified watchtowers on a coastal ridge: every
 * quota window is a tower whose height = used % (≥85% the
 * beacon fires amber); sessions are gulls riding the wind.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "towers";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // coastal sky
    const sky = `<defs><linearGradient id="tw-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a5a6a"/><stop offset="100%" stop-color="#6a7a8a"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#tw-s)" rx="10"/>`;
    // sea
    const sea = `<rect x="0" y="${GY - 10}" width="${W}" height="15" fill="color-mix(in srgb, #3a5a6a 75%, var(--card-2))"/>`;
    // ridge
    const ridge = `<path d="M 0 ${GY} L 0 ${GY - 25} L 50 ${GY - 40} L 120 ${GY - 22} L 190 ${GY - 45} L 260 ${GY - 30} L 330 ${GY - 42} L 400 ${GY - 35} L 400 ${GY} Z" fill="#4a5248" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #5a6258 65%, var(--card-2))"/>`;

    // towers — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const towers = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a8a78";
      const th = 25 + f * 85;
      const tw = 12 + f * 20;
      const topY = GY - th;
      // tower body
      const body = `<rect x="${cx - tw / 2}" y="${topY}" width="${tw}" height="${th}" fill="color-mix(in srgb, ${col} 50%, #5a6258)"/>`;
      // crenellations
      const cren = `<rect x="${cx - tw * .4}" y="${topY - 5}" width="${tw * .15}" height="6" fill="${col}"/>
        <rect x="${cx - tw * .1}" y="${topY - 5}" width="${tw * .15}" height="6" fill="${col}"/>
        <rect x="${cx + tw * .2}" y="${topY - 5}" width="${tw * .15}" height="6" fill="${col}"/>`;
      // window
      const win = `<rect x="${cx - 3}" y="${topY + 20}" width="6" height="8" fill="#3a4038" opacity=".6"/>`;
      // beacon fire
      const fire = hot ? `<circle cx="${cx}" cy="${topY - 8}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".8">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(6 + f * 3).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".8;.2" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="tw-tower${hot ? " hot" : ""}">
        ${body}${cren}${win}${fire}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="tw-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="tw-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // gulls — riding the wind
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = GY - 25 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0e0d8");
      const cx2 = W / 2 + (rnd() - .5) * 60;
      const cy2 = y;
      const rx2 = 40 + rnd() * 50;
      const ry2 = 10 + rnd() * 8;
      return `<g class="tw-gull${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .7} L ${-size * 1.8} ${size * .7} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tw-wrap">
        <div class="tw-head"><b>TOWERS</b><span>塔楼=配额窗 高=用量 海鸥=会话${hotN ? " · " + hotN + " 燃烽" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${ridge}${ground}${towers}${gulls}
          <g class="tw-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="tw-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="tw-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "塔楼", eyebrow: "TOWERS", render };
})();
