/* ------------------------------------------------------------------ butte
 * Butte — wind-carved red rock pillars on a high plain: every
 * quota window is a butte whose height = used % (≥85% the cap
 * rock glows amber); sessions are hawks circling the pillars.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "butte";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // hot sky
    const sky = `<defs><linearGradient id="bt-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c89060"/><stop offset="100%" stop-color="#e8c8a0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bt-s)" rx="10"/>`;
    // distant mesa
    const mesa = `<path d="M 0 ${GY - 30} L 80 ${GY - 45} L 160 ${GY - 45} L 240 ${GY - 55} L 320 ${GY - 55} L 400 ${GY - 40} L 400 ${GY} L 0 ${GY} Z" fill="#a86040" opacity=".3"/>`;
    // desert floor
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c8a080 60%, var(--card-2))"/>`;
    // sand ripples
    let ripples = "";
    for (let i = 0; i < 8; i++) {
      ripples += `<path d="M ${i * 52} ${GY + 8} Q ${i * 52 + 25} ${GY + 12} ${i * 52 + 50} ${GY + 8}" stroke="#a08060" stroke-width=".8" fill="none" opacity=".2"/>`;
    }

    // buttes — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const buttes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a06040";
      const bh = 25 + f * 90;
      const bw = 12 + f * 22;
      const topY = GY - bh;
      // pillar — stratified
      const body = `<path d="M ${cx - bw / 2} ${GY} L ${cx - bw * .35} ${topY} L ${cx + bw * .35} ${topY} L ${cx + bw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #c8a080)"/>`;
      // strata lines
      const strata = `<line x1="${cx - bw * .4}" y1="${GY - bh * .3}" x2="${cx + bw * .4}" y2="${GY - bh * .3}" stroke="${col}" stroke-width="1.5" opacity=".5"/>
        <line x1="${cx - bw * .38}" y1="${GY - bh * .55}" x2="${cx + bw * .38}" y2="${GY - bh * .55}" stroke="${col}" stroke-width="1.2" opacity=".4"/>
        <line x1="${cx - bw * .35}" y1="${GY - bh * .8}" x2="${cx + bw * .35}" y2="${GY - bh * .8}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // cap rock — flat top
      const cap = `<ellipse cx="${cx}" cy="${topY}" rx="${bw * .45}" ry="5" fill="color-mix(in srgb, ${col} 75%, #8a5030)"/>`;
      // hot glow on cap
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${bw * .45}" ry="6" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${bw * .45};${bw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="bt-butte${hot ? " hot" : ""}">
        ${body}${strata}${cap}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="bt-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="bt-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // hawks — circling the pillars
    const hawks = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY - 40 - (i % 3) * 18;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#3a2a1a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 45 + rnd() * 60;
      const ry2 = 10 + rnd() * 10;
      return `<g class="bt-hawk${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.6} ${-size * .6} L ${-size * 1.6} ${size * .6} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bt-wrap">
        <div class="bt-head"><b>BUTTE</b><span>岩柱=配额窗 高=用量 鹰=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${mesa}${ground}${ripples}${buttes}${hawks}
          <g class="bt-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bt-k">${fmt(k.tokens)} · ${sessions.length} 鹰</text>
            <text x="22" y="45" class="bt-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "孤丘", eyebrow: "BUTTE", render };
})();
