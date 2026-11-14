/* ------------------------------------------------------------------ geysers
 * Geysers — steaming vents on a mineral terrace: every quota
 * window is a geyser whose column height = used % (≥85% the
 * eruption burns amber); sessions are dragonflies darting
 * through the steam.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "geysers";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55337799);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // volcanic sky
    const sky = `<defs><linearGradient id="gp-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8b8a8"/><stop offset="100%" stop-color="#e8d8c0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#gp-s)" rx="10"/>`;
    // mineral terraces
    const terr = `<path d="M 0 ${GY} L 0 ${GY - 20} L 60 ${GY - 28} L 130 ${GY - 18} L 200 ${GY - 32} L 270 ${GY - 22} L 340 ${GY - 30} L 400 ${GY - 25} L 400 ${GY} Z" fill="#c0a890" opacity=".35"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b09880 55%, var(--card-2))"/>`;
    // mineral stains
    let stains = "";
    for (let i = 0; i < 10; i++) {
      stains += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 40).toFixed(1)}" rx="${(4 + rnd() * 10).toFixed(1)}" ry="${(2 + rnd() * 4).toFixed(1)}" fill="${["#c07840","#a88850","#889858"][i % 3]}" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // geysers — column height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const vents = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8898a0";
      const ch = 20 + f * 80;
      const vw = 12 + f * 18;
      const topY = GY - 8;
      // mineral cone
      const cone = `<path d="M ${cx - vw / 2} ${GY} L ${cx - vw * .3} ${topY} L ${cx + vw * .3} ${topY} L ${cx + vw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #908878)"/>`;
      // vent mouth
      const mouth = `<ellipse cx="${cx}" cy="${topY}" rx="${vw * .3}" ry="${(vw * .12).toFixed(1)}" fill="#385058" opacity=".8"/>`;
      // water column — height = used %
      const jet = `<path d="M ${cx - 2} ${topY} L ${cx - 1.5} ${topY - ch * .6} L ${cx} ${topY - ch} L ${cx + 1.5} ${topY - ch * .6} L ${cx + 2} ${topY} Z" fill="#d0e8f0" opacity="${(.4 + f * .35).toFixed(2)}">
        <animate attributeName="opacity" values="${(.4 + f * .35).toFixed(2)};${(.25 + f * .25).toFixed(2)};${(.4 + f * .35).toFixed(2)}" dur="${(2 - f).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // spray at the top
      const spray = `<circle cx="${cx - 4}" cy="${topY - ch}" r="${(2 + f * 2).toFixed(1)}" fill="#e0f0f8" opacity=".6"/>
        <circle cx="${cx + 4}" cy="${topY - ch - 3}" r="${(1.5 + f * 1.5).toFixed(1)}" fill="#d0e8f0" opacity=".55"/>
        <circle cx="${cx}" cy="${topY - ch - 6}" r="${(2.5 + f * 2).toFixed(1)}" fill="#e8f4fa" opacity=".5"/>`;
      // hot amber core
      const core = hot ? `<path d="M ${cx - 1} ${topY} L ${cx} ${topY - ch * .9} L ${cx + 1} ${topY} Z" fill="var(--amber)" opacity=".45">
        <animate attributeName="opacity" values=".45;.15;.45" dur="1s" repeatCount="indefinite"/></path>` : "";
      // steam wisps
      const steam = `<path d="M ${cx + vw * .4} ${GY - 5} Q ${cx + vw * .6} ${GY - 18} ${cx + vw * .5} ${GY - 30}" stroke="#d0d0c8" stroke-width="1.2" fill="none" opacity=".3">
        <animate attributeName="opacity" values=".3;.1;.3" dur="${(2.5 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      return `<g class="gp-vent${hot ? " hot" : ""}">
        ${cone}${mouth}${jet}${spray}${core}${steam}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="gp-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="gp-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // dragonflies — darting through the steam
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 40 - (i % 3) * 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#38a0b8");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 45 + rnd() * 55;
      const ry2 = 10 + rnd() * 12;
      return `<g class="gp-fly${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .3}" ry="${size * 1.4}" fill="${col}"/>
        <ellipse cx="${-size * .5}" cy="${-size * .2}" rx="${size * .9}" ry="${size * .25}" fill="#b8e0e8" opacity=".6"/>
        <ellipse cx="${size * .5}" cy="${-size * .2}" rx="${size * .9}" ry="${size * .25}" fill="#b8e0e8" opacity=".6"/>
        <circle cx="0" cy="${-size * 1.3}" r="${size * .3}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gp-wrap">
        <div class="gp-head"><b>GEYSERS</b><span>泉=配额窗 柱高=用量 蜻蜓=会话${hotN ? " · " + hotN + " 喷燃" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${terr}${ground}${stains}${vents}${flies}
          <g class="gp-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gp-k">${fmt(k.tokens)} · ${sessions.length} 蜓</text>
            <text x="22" y="45" class="gp-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "间歇泉", eyebrow: "GEYSERS", render };
})();
