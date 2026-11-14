/* ------------------------------------------------------------------ fins
 * Fins — blade-thin sandstone walls standing in rows: every
 * quota window is a fin whose height = used % (≥85% the
 * wind-carved window in the blade burns amber); sessions
 * are white-throated swifts threading the gaps.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fins";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(37437798);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // slickrock evening sky
    const sky = `<defs><linearGradient id="fb-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c87858"/><stop offset="100%" stop-color="#e0a878"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fb-s)" rx="10"/>`;
    // slickrock floor
    const slick = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c88050 55%, var(--card-2))"/>`;
    // sand ripples
    let ripples = "";
    for (let i = 0; i < 10; i++) {
      ripples += `<path d="M ${(rnd() * W).toFixed(1)} ${(GY + 6 + rnd() * 35).toFixed(1)} q 12 -3 24 0" stroke="#a06838" stroke-width=".8" fill="none" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }

    // fins — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const blades = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c06840";
      const fh = 30 + f * 90;
      const fw = 6 + f * 4;
      const topY = GY - fh;
      // blade — thin wall, slightly wavy top
      const blade = `<path d="M ${cx - fw / 2} ${GY} L ${cx - fw / 2} ${topY + 8} Q ${cx - fw * .3} ${topY} ${cx} ${topY + 2} Q ${cx + fw * .3} ${topY - 2} ${cx + fw / 2} ${topY + 6} L ${cx + fw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 65%, #a05028)"/>`;
      // desert varnish streaks
      const varnish = `<path d="M ${cx - fw * .3} ${topY + 15} L ${cx - fw * .3} ${GY - 10} M ${cx + fw * .2} ${topY + 25} L ${cx + fw * .2} ${GY - 15}" stroke="#482810" stroke-width="1" opacity=".4"/>`;
      // wind window — a hole through the blade
      const wy = topY + fh * .35;
      const win = `<ellipse cx="${cx}" cy="${wy}" rx="${fw * .3}" ry="${4 + f * 4}" fill="${hot ? "var(--amber)" : "#e0a878"}" opacity="${hot ? ".9" : ".85"}"/>`;
      const glow = hot ? `<ellipse cx="${cx}" cy="${wy}" rx="${fw * .5}" ry="${8 + f * 6}" fill="var(--amber)" opacity=".25">
        <animate attributeName="opacity" values=".25;.06;.25" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="fb-fin${hot ? " hot" : ""}">
        ${blade}${varnish}${win}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="fb-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="fb-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swifts — threading the gaps
    const swifts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(3.5, 8 - (s.tps || 0) / 16);
      const y = GY - 50 + (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#383028");
      return `<g class="fb-swift${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-15} ${y};${W + 15} ${(y - 20).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size * 1.4} 0 Q 0 ${-size * 1.1} ${size * 1.4} 0 Q 0 ${-size * .3} ${-size * 1.4} 0 Z" fill="${col}"/>
        <path d="M ${size * .3} 0 L ${size * 1.6} ${size * .4} L ${size * .9} ${size * .5} Z" fill="${col}"/>
        <ellipse cx="0" cy="${size * .15}" rx="${size * .3}" ry="${size * .18}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fb-wrap">
        <div class="fb-head"><b>FINS</b><span>石鳍=配额窗 高=用量 雨燕=会话${hotN ? " · " + hotN + " 燃窗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${slick}${ripples}${blades}${swifts}
          <g class="fb-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fb-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="fb-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石鳍", eyebrow: "FINS", render };
})();
