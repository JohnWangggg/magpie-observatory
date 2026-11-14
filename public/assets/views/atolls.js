/* ------------------------------------------------------------------ atolls
 * Atolls — coral rings around turquoise lagoons: every quota
 * window is an atoll whose ring size = used % (≥85% the palm
 * crown burns amber); sessions are terns circling the reef.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "atolls";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(17448800);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // tropical sky
    const sky = `<defs><linearGradient id="aa-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#88c8e0"/><stop offset="100%" stop-color="#c8e8f0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#aa-s)" rx="10"/>`;
    // deep sea
    const sea = `<rect x="0" y="${GY - 90}" width="${W}" height="90" fill="color-mix(in srgb, #2878a8 60%, var(--card-2))"/>`;
    // swell lines
    let swell = "";
    for (let i = 0; i < 5; i++) {
      swell += `<path d="M ${(rnd() * W).toFixed(1)} ${(GY - 70 + rnd() * 60).toFixed(1)} q 20 ${(rnd() * 3 - 1).toFixed(1)} 40 ${(rnd() * 3 - 1).toFixed(1)}" stroke="#78b8d8" stroke-width=".8" fill="none" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }
    // beach
    const beach = `<path d="M 0 ${GY} L 0 ${GY - 15} Q 100 ${GY - 28} 200 ${GY - 18} Q 300 ${GY - 30} 400 ${GY - 20} L 400 ${GY} Z" fill="color-mix(in srgb, #e0d0a0 65%, var(--card-2))"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #d0c090 60%, var(--card-2))"/>`;

    // atolls — ring size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const rings = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = GY - 55;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#38a8b8";
      const rr = 10 + f * 28;
      // coral ring — broken torus
      const ring = `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * .55}" fill="none" stroke="color-mix(in srgb, ${col} 70%, #4898a0)" stroke-width="${(4 + f * 5).toFixed(1)}" opacity=".85"/>`;
      // lagoon inside
      const lagoon = `<ellipse cx="${cx}" cy="${cy}" rx="${rr * .7}" ry="${rr * .35}" fill="color-mix(in srgb, #58c8d8 60%, var(--card-2))" opacity=".8"/>`;
      // palm on the ring
      const px = cx + rr * .6;
      const py = cy - rr * .3;
      const palm = `<path d="M ${px} ${py} Q ${px - 3} ${py - 12} ${px - 2} ${py - 18}" stroke="#785838" stroke-width="1.5" fill="none"/>
        <path d="M ${px - 2} ${py - 18} L ${px - 8} ${py - 15} M ${px - 2} ${py - 18} L ${px + 4} ${py - 16} M ${px - 2} ${py - 18} L ${px - 6} ${py - 22} M ${px - 2} ${py - 18} L ${px + 2} ${py - 23}" stroke="${hot ? "var(--amber)" : "#487848"}" stroke-width="1.5" fill="none" opacity="${hot ? ".9" : ".75"}"/>`;
      const glow = hot ? `<circle cx="${px - 2}" cy="${py - 18}" r="7" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="aa-ring${hot ? " hot" : ""}">
        ${lagoon}${ring}${palm}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="aa-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="aa-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // terns — circling the reef
    const terns = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 100 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#f0f0f0");
      const cx2 = W / 2 + (rnd() - .5) * 90;
      const rx2 = 45 + rnd() * 55;
      const ry2 = 10 + rnd() * 10;
      return `<g class="aa-tern${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .35}" fill="${col}"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.8} ${-size * .5} L ${-size * 1.8} ${size * .5} Z" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .1}" r="${size * .2}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="aa-wrap">
        <div class="aa-head"><b>ATOLLS</b><span>礁环=配额窗 环径=用量 燕鸥=会话${hotN ? " · " + hotN + " 燃冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${swell}${beach}${ground}${rings}${terns}
          <g class="aa-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="aa-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="aa-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "环礁", eyebrow: "ATOLLS", render };
})();
