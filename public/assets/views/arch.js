/* ------------------------------------------------------------------ arch
 * Arch — a natural stone arch over a tide pool: every quota
 * window is an arch whose span = used % (≥85% the keystone
 * glows amber); sessions are seabirds flying through the span.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "arch";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // sunset sky
    const sky = `<defs><linearGradient id="ac-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8a5a3a"/><stop offset="100%" stop-color="#c89060"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ac-s)" rx="10"/>`;
    // sea
    const sea = `<rect x="0" y="${GY - 8}" width="${W}" height="${H - GY + 8}" fill="color-mix(in srgb, #3a5a5a 75%, var(--card-2))"/>`;
    // rock shelf
    const shelf = `<rect x="0" y="${GY}" width="${W}" height="20" fill="color-mix(in srgb, #6a5038 70%, var(--card-2))"/>`;
    // tide pools
    let pools = "";
    for (let i = 0; i < 5; i++) {
      pools += `<ellipse cx="${(30 + i * 80).toFixed(1)}" cy="${(GY + 8).toFixed(1)}" rx="${(12 + rnd() * 15).toFixed(1)}" ry="${(3 + rnd() * 4).toFixed(1)}" fill="#3a6a6a" opacity=".4"/>`;
    }

    // arches — span = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const arches = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a6a4a";
      const aw = 20 + f * 35;
      const ah = 15 + f * 45;
      const leftX = cx - aw / 2;
      const rightX = cx + aw / 2;
      // arch — two legs + curved span
      const legL = `<path d="M ${leftX} ${GY} L ${leftX + aw * .15} ${GY - ah * .5} L ${cx - aw * .1} ${GY - ah} L ${cx + aw * .1} ${GY - ah} L ${rightX - aw * .15} ${GY - ah * .5} L ${rightX} ${GY}" stroke="color-mix(in srgb, ${col} 65%, #7a5a3a)" stroke-width="${(4 + f * 5).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // keystone
      const key = `<rect x="${cx - 5}" y="${GY - ah - 6}" width="10" height="8" rx="2" fill="color-mix(in srgb, ${col} 75%, #5a4030)"/>`;
      // hot amber glow
      const glow = hot ? `<circle cx="${cx}" cy="${GY - ah}" r="${(4 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(4 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="ac-arch${hot ? " hot" : ""}">
        ${legL}${key}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ac-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ac-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // seabirds — flying through the span
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 20 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e0d0");
      return `<g class="ac-bird${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .15}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .6} L ${-size * 1.8} ${size * .6} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ac-wrap">
        <div class="ac-head"><b>ARCH</b><span>石拱=配额窗 跨度=用量 海燕=会话${hotN ? " · " + hotN + " 燃拱" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${shelf}${pools}${arches}${birds}
          <g class="ac-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ac-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="ac-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拱门", eyebrow: "ARCH", render };
})();
