/* ------------------------------------------------------------------ needles
 * Needles — sharp granite needles on a high ridge: every quota
 * window is a needle whose height = used % (≥85% the tip burns
 * amber); sessions are swifts threading between the spires.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "needles";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // high ridge sky
    const sky = `<defs><linearGradient id="nd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8a870"/><stop offset="100%" stop-color="#e0c8a0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#nd-s)" rx="10"/>`;
    // ridge silhouette
    const ridge = `<path d="M 0 ${GY} L 0 ${GY - 35} L 50 ${GY - 55} L 110 ${GY - 30} L 170 ${GY - 60} L 240 ${GY - 38} L 310 ${GY - 52} L 370 ${GY - 45} L 400 ${GY - 50} L 400 ${GY} Z" fill="#a88058" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b09070 60%, var(--card-2))"/>`;
    // scree
    let scree = "";
    for (let i = 0; i < 12; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 25).toFixed(1)}" fill="#907858" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // needles — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const needles = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a08058";
      const nh = 30 + f * 85;
      const nw = 5 + f * 12;
      const tipY = GY - nh;
      // needle — sharp taper
      const body = `<path d="M ${cx - nw / 2} ${GY} L ${cx} ${tipY} L ${cx + nw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 60%, #8a6850)"/>`;
      // frost cracks
      const cracks = `<line x1="${cx - nw * .25}" y1="${GY - nh * .35}" x2="${cx - nw * .1}" y2="${GY - nh * .15}" stroke="${col}" stroke-width=".7" opacity=".4"/>
        <line x1="${cx + nw * .25}" y1="${GY - nh * .5}" x2="${cx + nw * .1}" y2="${GY - nh * .3}" stroke="${col}" stroke-width=".7" opacity=".4"/>`;
      // hot amber tip
      const glow = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(6 + f * 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="nd-needle${hot ? " hot" : ""}">
        ${body}${cracks}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="nd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="nd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swifts — threading between needles
    const swifts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(3, 9 - (s.tps || 0) / 14);
      const y = GY - 25 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#1a1a1a");
      return `<g class="nd-swift${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 10).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.6} ${-size * .5} L ${-size * 1.6} ${size * .5} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="nd-wrap">
        <div class="nd-head"><b>NEEDLES</b><span>石针=配额窗 高=用量 雨燕=会话${hotN ? " · " + hotN + " 燃尖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${ridge}${ground}${scree}${needles}${swifts}
          <g class="nd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="nd-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="nd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石针", eyebrow: "NEEDLES", render };
})();
