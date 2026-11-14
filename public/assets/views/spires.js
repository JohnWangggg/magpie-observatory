/* ------------------------------------------------------------------ spires
 * Spires — Gothic church spires against a dusk sky: every
 * quota window is a spire whose height = used % (≥85% the
 * finial burns amber); sessions are bats darting between towers.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "spires";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // dusk sky
    const sky = `<defs><linearGradient id="sr-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a3045"/><stop offset="100%" stop-color="#5a4865"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sr-s)" rx="10"/>`;
    // city silhouette
    const city = `<path d="M 0 ${GY} L 0 ${GY - 20} L 30 ${GY - 30} L 60 ${GY - 18} L 90 ${GY - 35} L 130 ${GY - 22} L 170 ${GY - 40} L 210 ${GY - 25} L 250 ${GY - 38} L 300 ${GY - 20} L 350 ${GY - 30} L 400 ${GY - 25} L 400 ${GY} Z" fill="#2a2438" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #3a3445 70%, var(--card-2))"/>`;
    // windows
    let windows = "";
    for (let i = 0; i < 8; i++) {
      windows += `<rect x="${(20 + i * 50).toFixed(1)}" y="${(GY + 5 + rnd() * 15).toFixed(1)}" width="4" height="5" fill="#d0c8a8" opacity="${(.1 + rnd() * .1).toFixed(2)}"/>`;
    }

    // spires — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const spires = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a8090";
      const sh = 30 + f * 90;
      const sw = 8 + f * 18;
      const topY = GY - sh;
      // tower body
      const body = `<rect x="${cx - sw / 2}" y="${topY + 15}" width="${sw}" height="${sh - 15}" fill="color-mix(in srgb, ${col} 45%, #4a4058)"/>`;
      // pointed roof
      const roof = `<path d="M ${cx - sw * .55} ${topY + 15} L ${cx} ${topY} L ${cx + sw * .55} ${topY + 15} Z" fill="color-mix(in srgb, ${col} 65%, #3a3048)"/>`;
      // arched windows
      const win1 = `<path d="M ${cx - sw * .2} ${topY + 30} A ${sw * .15} ${sw * .2} 0 0 1 ${cx + sw * .2} ${topY + 30} L ${cx + sw * .2} ${topY + 45} L ${cx - sw * .2} ${topY + 45} Z" fill="#c8b8a8" opacity=".3"/>`;
      const win2 = `<path d="M ${cx - sw * .2} ${topY + 55} A ${sw * .15} ${sw * .2} 0 0 1 ${cx + sw * .2} ${topY + 55} L ${cx + sw * .2} ${topY + 70} L ${cx - sw * .2} ${topY + 70} Z" fill="#c8b8a8" opacity=".25"/>`;
      // finial
      const finial = `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${topY - 8}" stroke="${col}" stroke-width="1.5"/><circle cx="${cx}" cy="${topY - 8}" r="2.5" fill="${col}"/>`;
      // hot amber glow
      const glow = hot ? `<circle cx="${cx}" cy="${topY - 8}" r="${(3 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(6 + f * 3).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="sr-spire${hot ? " hot" : ""}">
        ${body}${roof}${win1}${win2}${finial}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // bats — darting between towers
    const bats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY - 30 - (i % 3) * 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#2a2438");
      return `<g class="sr-bat${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <line x1="${-size * 1}" y1="0" x2="${-size * 1.7}" y2="${-size * .6}" stroke="${col}" stroke-width=".7"/>
        <line x1="${size * 1}" y1="0" x2="${size * 1.7}" y2="${-size * .6}" stroke="${col}" stroke-width=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sr-wrap">
        <div class="sr-head"><b>SPIRES</b><span>尖塔=配额窗 高=用量 蝙蝠=会话${hotN ? " · " + hotN + " 燃尖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${city}${ground}${windows}${spires}${bats}
          <g class="sr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sr-k">${fmt(k.tokens)} · ${sessions.length} 蝠</text>
            <text x="22" y="45" class="sr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "尖塔", eyebrow: "SPIRES", render };
})();
