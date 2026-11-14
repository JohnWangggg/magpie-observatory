/* ------------------------------------------------------------------ ridges
 * Ridges — a jagged mountain ridge line against the sky:
 * every quota window is a ridge peak whose height = used %
 * (≥85% the crest burns amber); sessions are hikers trekking
 * along the ridge walk.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ridges";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77889900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // alpine sky
    const sky = `<defs><linearGradient id="ri-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6878"/><stop offset="100%" stop-color="#8a98a8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ri-s)" rx="10"/>`;
    // far range
    const range = `<path d="M 0 ${GY} L 0 ${GY - 25} L 60 ${GY - 45} L 130 ${GY - 22} L 200 ${GY - 50} L 270 ${GY - 32} L 340 ${GY - 48} L 400 ${GY - 42} L 400 ${GY} Z" fill="#6a7888" opacity=".3"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #7a8890 60%, var(--card-2))"/>`;
    // scree
    let scree = "";
    for (let i = 0; i < 12; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 5 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 25).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 18 + rnd() * 25).toFixed(1)}" fill="#8a98a0" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // ridge peaks — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const peaks = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a98a0";
      const ph = 25 + f * 80;
      const pw = 12 + f * 22;
      const topY = GY - ph;
      // jagged peak — not a smooth triangle
      const body = `<path d="M ${cx - pw / 2} ${GY} L ${cx - pw * .35} ${topY + 12} L ${cx - pw * .1} ${topY} L ${cx + pw * .15} ${topY + 8} L ${cx + pw * .4} ${topY + 15} L ${cx + pw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #5a6878)"/>`;
      // snow on the north face
      const snow = `<path d="M ${cx - pw * .3} ${topY + 15} L ${cx - pw * .1} ${topY + 3} L ${cx} ${topY + 5} L ${cx} ${topY + 20} Z" fill="#e0e8f0" opacity=".5"/>`;
      // hot amber crest
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${pw * .3}" ry="4" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${pw * .3};${pw * .55}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ri-peak${hot ? " hot" : ""}">
        ${body}${snow}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ri-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ri-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // hikers — trekking along the ridge
    const hikers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 15 - (s.tps || 0) / 12);
      const y = GY - 20 - (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0d0b0");
      return `<g class="ri-hiker${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 10).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .4}" fill="${col}"/>
        <circle cx="${size * .5}" cy="${-size * .25}" r="${size * .2}" fill="${col}"/>
        <path d="M ${-size * .4} ${size * .2} L ${-size * .8} ${size * .7}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * .4} ${size * .2} L ${size * .8} ${size * .6}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * .6} ${-size * .1} L ${size * 1.2} ${-size * .8}" stroke="${col}" stroke-width=".4" fill="none" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ri-wrap">
        <div class="ri-head"><b>RIDGES</b><span>山脊=配额窗 高=用量 徒步者=会话${hotN ? " · " + hotN + " 燃脊" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${range}${ground}${scree}${peaks}${hikers}
          <g class="ri-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ri-k">${fmt(k.tokens)} · ${sessions.length} 徒</text>
            <text x="22" y="45" class="ri-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "山脊群", eyebrow: "RIDGES", render };
})();
