/* ------------------------------------------------------------------ playas
 * Playas — cracked mudflats under a hard sky: every quota
 * window is a polygon of cracked earth whose size = used %
 * (≥85% the salt crust at its centre burns amber); sessions
 * are sailing stones creeping across the pan.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "playas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(39660020);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 195, GY = 250;

    // bleached sky
    const sky = `<defs><linearGradient id="pj-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8ccb0"/><stop offset="100%" stop-color="#e8dfc8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#pj-s)" rx="10"/>`;
    // distant range
    const range = `<path d="M 0 ${WY} L 60 ${WY - 25} L 140 ${WY - 10} L 220 ${WY - 30} L 300 ${WY - 15} L 400 ${WY - 28} L 400 ${WY} Z" fill="#b0a080" opacity=".4"/>`;
    // the pan
    const pan = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #c8b890 60%, var(--card-2))"/>`;
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b8a878 60%, var(--card-2))"/>`;
    // background crack web
    let web = "";
    for (let i = 0; i < 10; i++) {
      const wx = rnd() * W, wy = WY + rnd() * (GY - WY);
      web += `<path d="M ${wx.toFixed(1)} ${wy.toFixed(1)} l ${(rnd() * 14 - 7).toFixed(1)} ${(rnd() * 8).toFixed(1)} l ${(rnd() * 10 - 5).toFixed(1)} ${(rnd() * 6).toFixed(1)}" stroke="#a08858" stroke-width=".5" fill="none" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }

    // cracked polygons — size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const polys = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = WY + (GY - WY) * .5;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b09468";
      const r = 8 + f * 16;
      // irregular hexagonal crack polygon
      const sides = 6;
      const pts = [];
      for (let a = 0; a < sides; a++) {
        const ang = (a / sides) * Math.PI * 2 + rnd() * .3;
        const rr = r * (0.8 + rnd() * .3);
        pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)},${(cy + Math.sin(ang) * rr * .55).toFixed(1)}`);
      }
      const poly = `<polygon points="${pts.join(" ")}" fill="color-mix(in srgb, ${col} 55%, #c0a878)" stroke="#887040" stroke-width="1.2"/>`;
      // inner crack lines
      const cracks = `<path d="M ${cx} ${cy} L ${pts[0]} M ${cx} ${cy} L ${pts[2]} M ${cx} ${cy} L ${pts[4]}" stroke="#887040" stroke-width=".6" opacity=".6"/>`;
      // salt crust at centre
      const crust = `<circle cx="${cx}" cy="${cy}" r="${2 + f * 3}" fill="${hot ? "var(--amber)" : "#e8e0d0"}" opacity="${hot ? ".9" : ".8"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${cy}" r="8" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="8;12" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.05" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="pj-poly${hot ? " hot" : ""}">
        ${poly}${cracks}${crust}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="pj-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="pj-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sailing stones — creeping with trail behind
    const stones = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 20 - (s.tps || 0) / 10);
      const y = WY + 12 + (i % 3) * 14;
      const size = 2 + Math.min(2, (s.tokens || 0) / 90000);
      const col = dead ? "var(--red)" : (m.color || "#685848");
      const trailLen = 25 + rnd() * 20;
      return `<g class="pj-stone${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${30 + i * 60} ${y};${30 + i * 60 + trailLen} ${(y + 4).toFixed(1)}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <path d="M ${-trailLen} 0 Q ${-trailLen / 2} 3 0 0" stroke="#a08858" stroke-width="1" fill="none" opacity=".6"/>
        <polygon points="${-size},0 ${-size * .3},${-size * .8} ${size * .7},${-size * .5} ${size},${size * .4} ${-size * .2},${size * .8}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pj-wrap">
        <div class="pj-head"><b>PLAYAS</b><span>干盐裂=配额窗 块大=用量 帆石=会话${hotN ? " · " + hotN + " 燃盐心" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${range}${pan}${web}${shore}${polys}${stones}
          <g class="pj-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pj-k">${fmt(k.tokens)} · ${sessions.length} 石</text>
            <text x="22" y="45" class="pj-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "干盐湖", eyebrow: "PLAYAS", render };
})();
