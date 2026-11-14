/* --------------------------------------------------------------------- dell
 * Dell — lily-of-the-valley in a shaded hollow: every quota window
 * is a lily stalk whose bell height = used % (≥85% the bells ring
 * golden); sessions are rabbits hopping the duff.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dell";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // hollow floor — leaf litter + moss
    const floor = `<path d="M 0 ${GY} Q 100 ${GY - 10} 200 ${GY - 6} T 400 ${GY - 8} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #161e14 74%, var(--card-2))"/>`;
    let litter = "";
    for (let i = 0; i < 14; i++) {
      litter += `<ellipse cx="${(20 + rnd() * (W - 40)).toFixed(1)}" cy="${(GY + 6 + rnd() * 40).toFixed(1)}" rx="${(3 + rnd() * 5).toFixed(1)}" ry="${(1 + rnd() * 1.5).toFixed(1)}" fill="#5a4a3a" opacity="${(.15 + rnd() * .25).toFixed(2)}"/>`;
    }
    // shade canopy overhead
    const shade = `<path d="M 0 0 L 400 0 L 400 60 Q 300 80 200 70 T 0 60 Z" fill="color-mix(in srgb, #0f180f 60%, transparent)" opacity=".7"/>`;

    // lily stalks — bell height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const lilies = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a8a4a";
      const lh = 30 + f * 90;
      const tipY = GY - lh;
      // stem
      const stem = `<path d="M ${cx} ${GY} Q ${cx + (rnd() - .5) * 6} ${GY - lh * .5} ${cx + (rnd() - .5) * 8} ${tipY}" stroke="#4a7a3a" stroke-width="1.2" fill="none" opacity=".8"/>`;
      // bells — nodding along the stem
      const bells = Math.round(2 + f * 5);
      let bloom = "";
      for (let b = 0; b < bells; b++) {
        const t = (b + 1) / (bells + 1);
        const bx = cx + (rnd() - .5) * 8;
        const by = GY - lh * t;
        const br = 2.5 + f * 2;
        bloom += `<path d="M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(bx - br).toFixed(1)} ${(by - br * .6).toFixed(1)} ${bx.toFixed(1)} ${(by - br * 1.4).toFixed(1)} Q ${(bx + br).toFixed(1)} ${(by - br * .6).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} Z" fill="${hot ? "var(--amber)" : "#e8f0e8"}" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      }
      // golden ring flash when hot
      const ring = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(4 + f * 3).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".6">
        <animate attributeName="r" values="${(4 + f * 3).toFixed(1)};${(10 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="dl-lily${hot ? " hot" : ""}">
        ${stem}${bloom}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="dl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="dl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // rabbits — sessions hopping the duff
    const rabbits = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const y = GY - 8 - (i % 2) * 10;
      const size = 3.5 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a88a6a");
      return `<g class="dl-rabbit${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24} ${y};${W + 24} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 ${-size * 1.6};0 0" dur=".5s" begin="${(-i * .4).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .8}" fill="${col}"/>
        <circle cx="${size * 1.2}" cy="${-size * .5}" r="${size * .45}" fill="${col}"/>
        <ellipse cx="${size * 1.4}" cy="${-size * 1.2}" rx="${size * .2}" ry="${size * .7}" fill="${col}"/>
        <ellipse cx="${size * 1.6}" cy="${-size * 1.2}" rx="${size * .15}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${-size * .8}" cy="${size * .5}" rx="${size * .6}" ry="${size * .3}" fill="${col}"/>
        <ellipse cx="${size * .6}" cy="${size * .6}" rx="${size * .5}" ry="${size * .25}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dl-wrap">
        <div class="dl-head"><b>DELL</b><span>铃兰=配额窗 高=用量 兔=会话${hotN ? " · " + hotN + " 金铃" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0e140e 60%, transparent)" rx="10"/>
          ${shade}${floor}${litter}${lilies}${rabbits}
          <g class="dl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="dl-k">${fmt(k.tokens)} · ${sessions.length} 兔</text>
            <text x="22" y="45" class="dl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "幽谷", eyebrow: "DELL", render };
})();
