/* ------------------------------------------------------------------ pinnacle
 * Pinnacle — a wind-sculpted stone spire on a mountain pass:
 * every quota window is a pinnacle whose height = used %
 * (≥85% the summit burns amber); sessions are eagles soaring past.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pinnacle";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // mountain pass sky
    const sky = `<defs><linearGradient id="pi-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8090a8"/><stop offset="100%" stop-color="#a8b0c0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#pi-s)" rx="10"/>`;
    // ridge silhouette
    const ridge = `<path d="M 0 ${GY} L 0 ${GY - 40} L 60 ${GY - 60} L 130 ${GY - 35} L 200 ${GY - 65} L 270 ${GY - 40} L 340 ${GY - 55} L 400 ${GY - 45} L 400 ${GY} Z" fill="#5a6a78" opacity=".5"/>`;
    // snow fields
    const snow = `<rect x="0" y="${GY - 15}" width="${W}" height="15" fill="#d0d8e0" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #8a98a8 60%, var(--card-2))"/>`;
    // loose scree
    let scree = "";
    for (let i = 0; i < 15; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 10 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 15 + rnd() * 30).toFixed(1)}" fill="#6a7888" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // pinnacles — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const pinnacles = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7a8a98";
      const ph = 30 + f * 90;
      const pw = 8 + f * 18;
      const tipY = GY - ph;
      // spire — jagged sides
      const body = `<path d="M ${cx - pw / 2} ${GY} L ${cx - pw * .35} ${tipY + 15} L ${cx} ${tipY} L ${cx + pw * .35} ${tipY + 15} L ${cx + pw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #5a6878)"/>`;
      // jagged edges
      const jag1 = `<path d="M ${cx - pw * .3} ${tipY + 20} L ${cx - pw * .45} ${tipY + 35} L ${cx - pw * .2} ${tipY + 40}" stroke="${col}" stroke-width="1" fill="none" opacity=".5"/>`;
      const jag2 = `<path d="M ${cx + pw * .3} ${tipY + 20} L ${cx + pw * .45} ${tipY + 35} L ${cx + pw * .2} ${tipY + 40}" stroke="${col}" stroke-width="1" fill="none" opacity=".5"/>`;
      // snow cap
      const snowcap = `<ellipse cx="${cx}" cy="${tipY + 3}" rx="${pw * .3}" ry="4" fill="#e0e8f0" opacity=".6"/>`;
      // hot amber tip
      const glow = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(6 + f * 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="pi-pin${hot ? " hot" : ""}">
        ${body}${jag1}${jag2}${snowcap}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="pi-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="pi-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // eagles — soaring past the pinnacles
    const eagles = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 13);
      const y = GY - 35 - (i % 3) * 18;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#2a3a4a");
      const cx2 = W / 2 + (rnd() - .5) * 60;
      const cy2 = y;
      const rx2 = 50 + rnd() * 70;
      const ry2 = 12 + rnd() * 10;
      return `<g class="pi-eagle${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .45}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1.1} 0 L ${-size * 1.8} ${-size * .7} L ${-size * 1.8} ${size * .7} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pi-wrap">
        <div class="pi-head"><b>PINNACLE</b><span>石柱=配额窗 高=用量 鹰=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${ridge}${snow}${ground}${scree}${pinnacles}${eagles}
          <g class="pi-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pi-k">${fmt(k.tokens)} · ${sessions.length} 鹰</text>
            <text x="22" y="45" class="pi-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石柱", eyebrow: "PINNACLE", render };
})();
