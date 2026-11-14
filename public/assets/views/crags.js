/* ------------------------------------------------------------------ crags
 * Crags — jagged limestone crags on a sea cliff: every quota
 * window is a crag whose height = used % (≥85% the summit
 * glows amber); sessions are fulmars riding the updraft.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crags";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66778899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // sea sky
    const sky = `<defs><linearGradient id="cj-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6a78"/><stop offset="100%" stop-color="#7a8a98"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cj-s)" rx="10"/>`;
    // sea
    const sea = `<rect x="0" y="${GY - 12}" width="${W}" height="18" fill="color-mix(in srgb, #3a5a6a 75%, var(--card-2))"/>`;
    // cliff edge
    const cliff = `<path d="M 0 ${GY} L 0 ${GY - 20} L 60 ${GY - 35} L 130 ${GY - 18} L 200 ${GY - 42} L 270 ${GY - 25} L 340 ${GY - 38} L 400 ${GY - 30} L 400 ${GY} Z" fill="#4a5048" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #5a6058 65%, var(--card-2))"/>`;
    // grass tufts
    let grass = "";
    for (let i = 0; i < 12; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#4a5a40" stroke-width=".8" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // crags — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const crags = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a8a7a";
      const ch = 25 + f * 80;
      const cw = 10 + f * 18;
      const topY = GY - ch;
      // jagged crag — irregular outline
      const body = `<path d="M ${cx - cw / 2} ${GY} L ${cx - cw * .4} ${topY + 15} L ${cx - cw * .1} ${topY} L ${cx + cw * .2} ${topY + 10} L ${cx + cw * .4} ${topY + 5} L ${cx + cw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #5a6058)"/>`;
      // lichen patches
      const lichen = `<ellipse cx="${cx - cw * .2}" cy="${GY - ch * .4}" rx="${cw * .15}" ry="${ch * .08}" fill="#a8b888" opacity=".3"/>`;
      // hot amber summit
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${cw * .35}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${cw * .35};${cw * .6}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="cj-crag${hot ? " hot" : ""}">
        ${body}${lichen}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="cj-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="cj-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fulmars — riding the updraft
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY - 30 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e0e0d0");
      return `<g class="cj-bird${dead ? " dead" : ""}">
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
      <div class="cj-wrap">
        <div class="cj-head"><b>CRAGS</b><span>峭壁=配额窗 高=用量 海燕=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${cliff}${ground}${grass}${crags}${birds}
          <g class="cj-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cj-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="cj-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "峭壁", eyebrow: "CRAGS", render };
})();
