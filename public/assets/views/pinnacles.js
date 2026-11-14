/* ------------------------------------------------------------------ pinnacles
 * Pinnacles — a cluster of thin stone spires like a pipe organ:
 * every quota window is a pinnacle whose height = used %
 * (≥85% the tip burns amber); sessions are swifts weaving
 * through the forest of spires.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pinnacles";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;

    // warm sky
    const sky = `<defs><linearGradient id="pz-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b08060"/><stop offset="100%" stop-color="#d0a080"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#pz-s)" rx="10"/>`;
    // canyon walls
    const walls = `<path d="M 0 ${GY} L 0 ${GY - 30} L 50 ${GY - 50} L 110 ${GY - 30} L 170 ${GY - 55} L 240 ${GY - 38} L 310 ${GY - 52} L 370 ${GY - 45} L 400 ${GY - 48} L 400 ${GY} Z" fill="#a07050" opacity=".3"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b08868 65%, var(--card-2))"/>`;
    // debris
    let debris = "";
    for (let i = 0; i < 12; i++) {
      debris += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 25).toFixed(1)}" fill="#8a6858" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // pinnacles — cluster of thin spires
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const pins = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a07050";
      const ph = 30 + f * 85;
      const pw = 6 + f * 14;
      const tipY = GY - ph;
      // main spire
      const body = `<path d="M ${cx - pw / 2} ${GY} L ${cx - pw * .35} ${tipY + 10} L ${cx} ${tipY} L ${cx + pw * .35} ${tipY + 10} L ${cx + pw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #8a6850)"/>`;
      // side needles
      const needleL = `<path d="M ${cx - pw * .4} ${GY} L ${cx - pw * .5} ${tipY + 25} L ${cx - pw * .3} ${tipY + 25} L ${cx - pw * .2} ${GY}" stroke="${col}" stroke-width="1" opacity=".5"/>`;
      const needleR = `<path d="M ${cx + pw * .4} ${GY} L ${cx + pw * .5} ${tipY + 30} L ${cx + pw * .3} ${tipY + 30} L ${cx + pw * .2} ${GY}" stroke="${col}" stroke-width="1" opacity=".5"/>`;
      // hoodoo cap
      const cap = `<ellipse cx="${cx}" cy="${tipY + 4}" rx="${pw * .45}" ry="4" fill="color-mix(in srgb, ${col} 75%, #6a4838)"/>`;
      // hot amber tip
      const glow = hot ? `<ellipse cx="${cx}" cy="${tipY + 4}" rx="${pw * .45}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${pw * .45};${pw * .75}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.2" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="pz-pin${hot ? " hot" : ""}">
        ${body}${needleL}${needleR}${cap}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="pz-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="pz-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swifts — weaving through spires
    const swifts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = GY - 25 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#1a1a1a");
      return `<g class="pz-swift${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1} 0 L ${-size * 1.6} ${-size * .5} L ${-size * 1.6} ${size * .5} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pz-wrap">
        <div class="pz-head"><b>PINNACLES</b><span>石针群=配额窗 高=用量 雨燕=会话${hotN ? " · " + hotN + " 燃尖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${walls}${ground}${debris}${pins}${swifts}
          <g class="pz-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pz-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="pz-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石针群", eyebrow: "PINNACLES", render };
})();
