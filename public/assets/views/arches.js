/* ------------------------------------------------------------------ arches
 * Arches — a row of sandstone arches along a canyon rim:
 * every quota window is an arch whose span = used % (≥85%
 * the keystone burns amber); sessions are swifts threading
 * through the openings.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "arches";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // canyon sky
    const sky = `<defs><linearGradient id="ah-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c88050"/><stop offset="100%" stop-color="#e0a070"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ah-s)" rx="10"/>`;
    // canyon walls
    const walls = `<path d="M 0 ${GY} L 0 ${GY - 30} L 60 ${GY - 50} L 130 ${GY - 28} L 200 ${GY - 55} L 270 ${GY - 35} L 340 ${GY - 48} L 400 ${GY - 40} L 400 ${GY} Z" fill="#a06038" opacity=".3"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b08058 60%, var(--card-2))"/>`;
    // debris
    let debris = "";
    for (let i = 0; i < 10; i++) {
      debris += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 25).toFixed(1)}" fill="#8a5838" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // arches — span = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const arches = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b07048";
      const aw = 18 + f * 38;
      const ah = 15 + f * 50;
      const leftX = cx - aw / 2;
      const rightX = cx + aw / 2;
      // arch legs + curved span
      const legL = `<path d="M ${leftX} ${GY} L ${leftX + aw * .1} ${GY - ah * .4} L ${cx - aw * .15} ${GY - ah} L ${cx + aw * .15} ${GY - ah} L ${rightX - aw * .1} ${GY - ah * .4} L ${rightX} ${GY}" stroke="color-mix(in srgb, ${col} 60%, #7a4830)" stroke-width="${(4 + f * 6).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // keystone
      const key = `<rect x="${cx - 5}" y="${GY - ah - 5}" width="10" height="7" rx="2" fill="color-mix(in srgb, ${col} 70%, #5a3828)"/>`;
      // hot amber glow
      const glow = hot ? `<ellipse cx="${cx}" cy="${GY - ah}" rx="${(5 + f * 3).toFixed(1)}" ry="${(4 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${(5 + f * 3).toFixed(1)};${(9 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.1" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ah-arch${hot ? " hot" : ""}">
        ${legL}${key}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ah-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ah-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swifts — threading through
    const swifts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 20 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#1a1a1a");
      return `<g class="ah-swift${dead ? " dead" : ""}">
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
      <div class="ah-wrap">
        <div class="ah-head"><b>ARCHES</b><span>石拱=配额窗 跨度=用量 雨燕=会话${hotN ? " · " + hotN + " 燃拱" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${walls}${ground}${debris}${arches}${swifts}
          <g class="ah-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ah-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="ah-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拱门群", eyebrow: "ARCHES", render };
})();
