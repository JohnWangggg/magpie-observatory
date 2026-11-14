/* ------------------------------------------------------------------ mesas
 * Mesas — flat-topped tablelands in a desert basin: every
 * quota window is a mesa whose top width = used % (≥85% the
 * rim glows amber); sessions are buzzards circling the mesa.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mesas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // desert sky
    const sky = `<defs><linearGradient id="ms-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c88050"/><stop offset="100%" stop-color="#e0a878"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ms-s)" rx="10"/>`;
    // distant butte
    const butte = `<path d="M 0 ${GY} L 0 ${GY - 25} L 60 ${GY - 40} L 130 ${GY - 40} L 200 ${GY - 55} L 270 ${GY - 55} L 340 ${GY - 42} L 400 ${GY - 35} L 400 ${GY} Z" fill="#b06840" opacity=".3"/>`;
    // basin floor
    const floor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c8a078 60%, var(--card-2))"/>`;
    // sand streaks
    let sand = "";
    for (let i = 0; i < 10; i++) {
      sand += `<path d="M ${i * 45} ${GY + 8} Q ${i * 45 + 20} ${GY + 12} ${i * 45 + 40} ${GY + 8}" stroke="#a88060" stroke-width=".8" fill="none" opacity=".2"/>`;
    }

    // mesas — top width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const mesas = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a06840";
      const mw = 15 + f * 40;
      const mh = 30 + f * 60;
      const topY = GY - mh;
      // mesa — flat top + sloped sides
      const body = `<path d="M ${cx - mw / 2} ${GY} L ${cx - mw * .35} ${topY} L ${cx + mw * .35} ${topY} L ${cx + mw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #b08058)"/>`;
      // strata
      const strata = `<line x1="${cx - mw * .35}" y1="${GY - mh * .3}" x2="${cx + mw * .35}" y2="${GY - mh * .3}" stroke="${col}" stroke-width="1.5" opacity=".4"/>
        <line x1="${cx - mw * .38}" y1="${GY - mh * .6}" x2="${cx + mw * .38}" y2="${GY - mh * .6}" stroke="${col}" stroke-width="1.2" opacity=".35"/>
        <line x1="${cx - mw * .4}" y1="${GY - mh * .85}" x2="${cx + mw * .4}" y2="${GY - mh * .85}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // flat top edge
      const rim = `<rect x="${cx - mw * .35}" y="${topY - 4}" width="${mw * .7}" height="4" fill="color-mix(in srgb, ${col} 70%, #8a5030)"/>`;
      // hot amber rim
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${mw * .35}" ry="5" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${mw * .35};${mw * .6}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ms-mesa${hot ? " hot" : ""}">
        ${body}${strata}${rim}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ms-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ms-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // buzzards — circling
    const buzzards = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 13);
      const y = GY - 30 - (i % 3) * 18;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#3a2a1a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 45 + rnd() * 60;
      const ry2 = 10 + rnd() * 10;
      return `<g class="ms-bird${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .45}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .6} L ${-size * 1.8} ${size * .6} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ms-wrap">
        <div class="ms-head"><b>MESAS</b><span>平顶山=配额窗 顶宽=用量 兀鹫=会话${hotN ? " · " + hotN + " 燃沿" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${butte}${floor}${sand}${mesas}${buzzards}
          <g class="ms-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ms-k">${fmt(k.tokens)} · ${sessions.length} 鹫</text>
            <text x="22" y="45" class="ms-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "平顶山", eyebrow: "MESAS", render };
})();
