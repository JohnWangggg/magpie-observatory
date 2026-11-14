/* ------------------------------------------------------------------ grotto
 * Grotto — a limestone sea cave: every quota window is a stalactite
 * whose length = used % (≥85% the tip glows amber and drips);
 * sessions are bats circling the cave.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "grotto";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66778899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 252;

    // cave walls
    const cave = `<path d="M 0 0 L 0 ${H} L 80 ${H} L 60 ${GY - 10} L 100 ${GY - 40} L 160 ${GY - 30} L 240 ${GY - 50} L 320 ${GY - 35} L 400 ${GY - 20} L 400 0 Z" fill="color-mix(in srgb, #1a1814 80%, var(--card-2))"/>`;
    // pool on floor
    const pool = `<rect x="0" y="${GY + 10}" width="${W}" height="${H - GY - 10}" fill="color-mix(in srgb, #12202a 80%, var(--card-2))"/>
      <ellipse cx="${W / 2}" cy="${GY + 30}" rx="${W * .35}" ry="15" fill="#1a2830" opacity=".6"/>`;
    // faint specks
    let specks = "";
    for (let i = 0; i < 15; i++) {
      specks += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(20 + rnd() * (GY - 30)).toFixed(1)}" r="${(rnd() * 1 + .3).toFixed(1)}" fill="#8a7a5a" opacity="${(.05 + rnd() * .1).toFixed(2)}"/>`;
    }

    // stalactites — length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const caves = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7a5a";
      const sh = 20 + f * 80;
      const sw = 8 + f * 14;
      const tipY = 20 + sh;
      // stalactite — hanging cone
      const body = `<path d="M ${cx - sw / 2} 20 L ${cx} ${tipY} L ${cx + sw / 2} 20 Z" fill="color-mix(in srgb, ${col} 45%, #2a241c)"/>`;
      // mineral rings
      const rings = `<line x1="${cx - sw * .3}" y1="${20 + sh * .25}" x2="${cx + sw * .3}" y2="${20 + sh * .25}" stroke="${col}" stroke-width=".8" opacity=".4"/>
        <line x1="${cx - sw * .25}" y1="${20 + sh * .5}" x2="${cx + sw * .25}" y2="${20 + sh * .5}" stroke="${col}" stroke-width=".6" opacity=".3"/>
        <line x1="${cx - sw * .15}" y1="${20 + sh * .75}" x2="${cx + sw * .15}" y2="${20 + sh * .75}" stroke="${col}" stroke-width=".5" opacity=".2"/>`;
      // drip — falls into pool
      const drip = hot ? `<circle cx="${cx}" cy="${tipY}" r="1.8" fill="var(--amber)">
          <animate attributeName="cy" values="${tipY};${GY + 8}" dur="${(1.2 + rnd()).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(1.2 + rnd()).toFixed(1)}s" repeatCount="indefinite"/></circle>
        <circle cx="${cx}" cy="${tipY}" r="2.5" fill="var(--amber)" opacity=".3">
          <animate attributeName="r" values="2.5;${(4 + rnd() * 2).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".3;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // tip glow
      const glow = hot ? `<circle cx="${cx}" cy="${tipY}" r="4" fill="var(--amber)" opacity=".6"/>` : "";
      return `<g class="gr-cave${hot ? " hot" : ""}">
        ${body}${rings}${drip}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="gr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="gr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // bats — sessions circling
    const bats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const y = 40 + (i % 3) * 20;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#6a5a3a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 50 + rnd() * 70;
      const ry2 = 10 + rnd() * 10;
      return `<g class="gr-bat${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <line x1="${-size * 1}" y1="0" x2="${-size * 1.7}" y2="${-size * .7}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * 1}" y1="0" x2="${size * 1.7}" y2="${-size * .7}" stroke="${col}" stroke-width=".7"/>
        <ellipse cx="0" cy="${size * .3}" rx="${size * .2}" ry="${size * .15}" fill="${col}" opacity=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gr-wrap">
        <div class="gr-head"><b>GROTTO</b><span>钟乳石=配额窗 长=用量 蝙蝠=会话${hotN ? " · " + hotN + " 滴水" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #141210 65%, transparent)" rx="10"/>
          ${cave}${pool}${specks}${caves}${bats}
          <g class="gr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gr-k">${fmt(k.tokens)} · ${sessions.length} 蝠</text>
            <text x="22" y="45" class="gr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "岩洞", eyebrow: "GROTTO", render };
})();
