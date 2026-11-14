/* ------------------------------------------------------------------ domes
 * Domes — smooth granite domes under a granite sky: every
 * quota window is a dome whose radius = used % (≥85% the
 * crown glows amber); sessions are climbers scaling the rock.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "domes";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(10112233);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // granite sky
    const sky = `<defs><linearGradient id="dm-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6878"/><stop offset="100%" stop-color="#7a8a98"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dm-s)" rx="10"/>`;
    // far ridge
    const ridge = `<path d="M 0 ${GY} L 0 ${GY - 30} L 70 ${GY - 50} L 140 ${GY - 28} L 210 ${GY - 55} L 280 ${GY - 35} L 350 ${GY - 48} L 400 ${GY - 38} L 400 ${GY} Z" fill="#6a7888" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #7a8a90 60%, var(--card-2))"/>`;
    // rock texture
    let texture = "";
    for (let i = 0; i < 15; i++) {
      texture += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#5a6a70" stroke-width=".7" opacity="${(.15 + rnd() * .1).toFixed(2)}"/>`;
    }

    // domes — radius = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const domes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a9aa8";
      const dr = 10 + f * 30;
      // dome — half-circle
      const body = `<path d="M ${cx - dr} ${GY} A ${dr} ${dr} 0 0 1 ${cx + dr} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #8a9898)"/>`;
      // crack lines
      const crack = `<path d="M ${cx - dr * .5} ${GY - dr * .5} L ${cx - dr * .2} ${GY - dr * .8}" stroke="${col}" stroke-width=".8" opacity=".4"/>`;
      // snow patch
      const snow = `<ellipse cx="${cx + dr * .3}" cy="${GY - dr * .7}" rx="${dr * .25}" ry="${dr * .1}" fill="#e0e8f0" opacity=".5"/>`;
      // hot amber crown
      const glow = hot ? `<ellipse cx="${cx}" cy="${GY - dr}" rx="${dr * .4}" ry="${dr * .15}" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${dr * .4};${dr * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="dm-dome${hot ? " hot" : ""}">
        ${body}${crack}${snow}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="dm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="dm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // climbers — scaling the domes
    const climbers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 16 - (s.tps || 0) / 11);
      const y = GY - 20 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0d0b0");
      return `<g class="dm-climb${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 12).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .4}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .2}" r="${size * .2}" fill="${col}"/>
        <path d="M ${-size * .5} ${size * .2} L ${-size * 1} ${size * .7}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * .5} ${size * .2} L ${size * .9} ${size * .6}" stroke="${col}" stroke-width=".6" fill="none"/>
        <line x1="0" y1="0" x2="0" y2="${-size * .8}" stroke="${col}" stroke-width=".5" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dm-wrap">
        <div class="dm-head"><b>DOMES</b><span>穹顶=配额窗 半径=用量 攀岩者=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${ridge}${ground}${texture}${domes}${climbers}
          <g class="dm-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="dm-k">${fmt(k.tokens)} · ${sessions.length} 攀</text>
            <text x="22" y="45" class="dm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "穹顶", eyebrow: "DOMES", render };
})();
