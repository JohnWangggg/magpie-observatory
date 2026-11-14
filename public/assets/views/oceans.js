/* ------------------------------------------------------------------ oceans
 * Oceans — rolling ocean swells under an open sky: every quota
 * window is a swell whose wave height = used % (≥85% the crest
 * sprays amber); sessions are albatross riding the wind.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oceans";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22113344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 235;

    // marine sky
    const sky = `<defs><linearGradient id="os-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8c8d8"/><stop offset="100%" stop-color="#d8e8f0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#os-s)" rx="10"/>`;
    // distant clouds
    let clouds = "";
    for (let i = 0; i < 4; i++) {
      clouds += `<ellipse cx="${(60 + i * 90).toFixed(1)}" cy="${(20 + rnd() * 30).toFixed(1)}" rx="${(25 + rnd() * 15).toFixed(1)}" ry="${(8 + rnd() * 6).toFixed(1)}" fill="#e8f0f8" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }
    // far sea
    const farSea = `<rect x="0" y="${GY - 15}" width="${W}" height="20" fill="color-mix(in srgb, #5a98b8 55%, var(--card-2))"/>`;
    // sea
    const sea = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #4a88a8 60%, var(--card-2))"/>`;
    // foam lines
    let foam = "";
    for (let i = 0; i < 6; i++) {
      foam += `<path d="M ${(rnd() * W).toFixed(1)} ${(GY + 5 + rnd() * 35).toFixed(1)} Q ${(rnd() * W).toFixed(1)} ${(GY + 3 + rnd() * 35).toFixed(1)} ${(rnd() * W).toFixed(1)} ${(GY + 5 + rnd() * 35).toFixed(1)}" stroke="#c8e8f0" stroke-width=".7" fill="none" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // swells — wave height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const swells = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a98c8";
      const sh = 15 + f * 75;
      const sw = 15 + f * 20;
      const topY = GY - sh;
      // swell face — a curling wave
      const face = `<path d="M ${cx - sw / 2} ${GY} Q ${cx - sw * .15} ${topY} ${cx + sw * .2} ${topY + 8} Q ${cx + sw * .5} ${topY + 2} ${cx + sw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #6aa8c8)"/>`;
      // wave curl (white crest)
      const curl = `<path d="M ${cx + sw * .1} ${topY + 5} Q ${cx + sw * .4} ${topY} ${cx + sw * .45} ${topY + 12}" stroke="#e8f4f8" stroke-width="2.5" fill="none" opacity=".7"/>`;
      // hot amber spray
      const spray = hot ? `<ellipse cx="${cx + sw * .25}" cy="${topY - 2}" rx="${(5 + f * 3).toFixed(1)}" ry="3" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${(5 + f * 3).toFixed(1)};${(9 + f * 4).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="1.5s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="os-swell${hot ? " hot" : ""}">
        ${face}${curl}${spray}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="os-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="os-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // albatross — riding the wind
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = 40 + (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#d8e0e8");
      const startX = -20;
      const endX = W + 20;
      const ry = 10 + rnd() * 10;
      return `<g class="os-bird${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${startX} ${y} Q ${(W * .3).toFixed(1)} ${(y - ry).toFixed(1)} ${(W * .6).toFixed(1)} ${y} Q ${(W * .8).toFixed(1)} ${(y + ry).toFixed(1)} ${endX} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .4}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .2}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.9} ${-size * .6} L ${-size * 1.9} ${size * .6} Z" fill="${col}"/>
        <path d="M ${size * .6} 0 L ${size * 1.3} ${-size * .3}" stroke="${col}" stroke-width=".5" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="os-wrap">
        <div class="os-head"><b>OCEANS</b><span>浪=配额窗 浪高=用量 信天翁=会话${hotN ? " · " + hotN + " 喷沫" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${clouds}${farSea}${sea}${foam}${swells}${birds}
          <g class="os-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="os-k">${fmt(k.tokens)} · ${sessions.length} 鸟</text>
            <text x="22" y="45" class="os-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海洋", eyebrow: "OCEANS", render };
})();
