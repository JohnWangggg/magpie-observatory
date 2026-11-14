/* --------------------------------------------------------------------- cove
 * Cove — sea stacks in a sheltered bay: every quota window is a
 * stack whose height = used % (≥85% the top wears a gull colony
 * that scatters white); sessions are seals bobbing between stacks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cove";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 226;

    // sea
    const sea = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a3a4a 68%, var(--card-2))"/>
      <path d="M 0 ${GY} Q 100 ${GY - 3} 200 ${GY} T 400 ${GY}" stroke="#6aaac8" stroke-width="1" fill="none" opacity=".4">
        <animate attributeName="d" values="M 0 ${GY} Q 100 ${GY - 3} 200 ${GY} T 400 ${GY};M 0 ${GY} Q 100 ${GY + 3} 200 ${GY} T 400 ${GY};M 0 ${GY} Q 100 ${GY - 3} 200 ${GY} T 400 ${GY}" dur="6s" repeatCount="indefinite"/></path>`;
    // wavelets
    let waves = "";
    for (let i = 0; i < 8; i++) {
      const wx = 30 + i * 48 + rnd() * 14;
      waves += `<path d="M ${wx.toFixed(1)} ${(GY + 8 + rnd() * 40).toFixed(1)} q 4 -2 8 0 q -4 2 -8 0" stroke="#a8d8e8" stroke-width=".7" fill="none" opacity="${(.2 + rnd() * .2).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 8} 0;0 0" dur="${(3 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    }

    // sea stacks — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const stacks = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a7a6a";
      const sh = 30 + f * 110;
      const sw = 10 + f * 14;
      const tipY = GY - sh;
      // stack body — tapered rock with ledges
      const ledges = Math.round(2 + f * 3);
      let body = "";
      for (let s = 0; s < ledges; s++) {
        const t = s / Math.max(1, ledges - 1);
        const y0 = GY - t * (sh - 14);
        const y1 = y0 - (sh - 14) / ledges;
        const bw = sw * (1 - t * .45);
        body += `<path d="M ${cx - bw} ${y0} L ${cx - bw * .9} ${y1} L ${cx + bw * .9} ${y1} L ${cx + bw} ${y0} Z" fill="color-mix(in srgb, ${col} ${45 + f * 35}%, #2a2a26)" opacity="${(.7 + t * .2).toFixed(2)}"/>`;
      }
      // flat top
      const top = `<ellipse cx="${cx}" cy="${tipY + 2}" rx="${sw * .8}" ry="3" fill="${hot ? "#e8e0c8" : "color-mix(in srgb, " + col + " 60%, #d8d0b8)"}"/>`;
      // gull colony when hot — white dots scattering
      let gulls = "";
      if (hot) {
        for (let g = 0; g < 4; g++) {
          gulls += `<circle cx="${(cx - sw * .5 + g * sw * .4).toFixed(1)}" cy="${(tipY - 2).toFixed(1)}" r="${(1 + rnd()).toFixed(1)}" fill="#f0f0e8" opacity=".9">
            <animate attributeName="cy" values="${(tipY - 2).toFixed(1)};${(tipY - 14 - rnd() * 10).toFixed(1)}" dur="${(1 + rnd()).toFixed(1)}s" begin="${(-rnd()).toFixed(1)}s" repeatCount="indefinite"/>
            <animate attributeName="cx" values="${(cx - sw * .5 + g * sw * .4).toFixed(1)};${(cx - sw * .5 + g * sw * .4 + (rnd() - .5) * 16).toFixed(1)}" dur="${(1 + rnd()).toFixed(1)}s" begin="${(-rnd()).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
        }
      }
      return `<g class="co-stack${hot ? " hot" : ""}">
        ${body}${top}${gulls}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="co-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="co-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // seals — sessions bobbing between stacks
    const seals = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 18 - (s.tps || 0) / 10);
      const y = GY + 14 + (i % 2) * 10;
      const size = 4 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#7a8a8a");
      return `<g class="co-seal${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y};${W + 26} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .7}" fill="${col}"/>
        <path d="M ${size * 1.4} ${-size * .2} L ${size * 2.2} ${-size * 1} L ${size * 2.4} ${-size * .6} L ${size * 1.8} ${size * .3} Z" fill="${col}"/>
        <circle cx="${size * 2.2}" cy="${-size * .9}" r="${size * .42}" fill="${col}"/>
        <circle cx="${size * 2.4}" cy="${-size * 1}" r="${size * .12}" fill="#1a1a1a"/>
        <ellipse cx="${-size * .8}" cy="${size * .5}" rx="${size * .6}" ry="${size * .25}" fill="${col}"/>
        <ellipse cx="${size * .6}" cy="${size * .5}" rx="${size * .6}" ry="${size * .25}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="co-wrap">
        <div class="co-head"><b>COVE</b><span>柱=配额窗 高=用量 豹=会话${hotN ? " · " + hotN + " 鸥群" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #101a20 54%, transparent)" rx="10"/>
          ${sea}${waves}${stacks}${seals}
          <g class="co-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="co-k">${fmt(k.tokens)} · ${sessions.length} 豹</text>
            <text x="22" y="45" class="co-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海湾", eyebrow: "COVE", render };
})();
