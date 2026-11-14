/* ------------------------------------------------------------------ outcrops
 * Outcrops — exposed rock strata on a hillside: every quota
 * window is an outcrop whose width = used % (≥85% the face
 * glows amber); sessions are marmots sunning on the rocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "outcrops";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99001122);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // hillside sky
    const sky = `<defs><linearGradient id="oo-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7a8a90"/><stop offset="100%" stop-color="#9aa8a8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#oo-s)" rx="10"/>`;
    // hillside slope
    const slope = `<path d="M 0 ${GY} L 0 ${GY - 30} L 80 ${GY - 45} L 160 ${GY - 25} L 240 ${GY - 50} L 320 ${GY - 30} L 400 ${GY - 40} L 400 ${GY} Z" fill="#5a6858" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #7a8878 65%, var(--card-2))"/>`;
    // grass tufts
    let grass = "";
    for (let i = 0; i < 12; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#4a5a40" stroke-width=".8" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // outcrops — width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const crops = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a8878";
      const cw = 15 + f * 35;
      const ch = 15 + f * 40;
      const topY = GY - ch;
      // layered strata — flat top
      const body = `<path d="M ${cx - cw / 2} ${GY} L ${cx - cw * .4} ${topY + 5} L ${cx + cw * .4} ${topY + 5} L ${cx + cw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #6a6858)"/>`;
      // strata lines
      const str1 = `<line x1="${cx - cw * .4}" y1="${GY - ch * .35}" x2="${cx + cw * .4}" y2="${GY - ch * .35}" stroke="${col}" stroke-width="1.5" opacity=".4"/>`;
      const str2 = `<line x1="${cx - cw * .38}" y1="${GY - ch * .6}" x2="${cx + cw * .38}" y2="${GY - ch * .6}" stroke="${col}" stroke-width="1.2" opacity=".35"/>`;
      const str3 = `<line x1="${cx - cw * .35}" y1="${GY - ch * .85}" x2="${cx + cw * .35}" y2="${GY - ch * .85}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // flat top
      const top = `<rect x="${cx - cw * .35}" y="${topY}" width="${cw * .7}" height="5" fill="color-mix(in srgb, ${col} 65%, #8a8878)"/>`;
      // hot amber face
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY + 8}" rx="${cw * .3}" ry="5" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${cw * .3};${cw * .55}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="oo-crop${hot ? " hot" : ""}">
        ${body}${str1}${str2}${str3}${top}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="oo-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="oo-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // marmots — sunning on the rocks
    const marmots = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 15 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 2) * 10;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a08050");
      return `<g class="oo-marm${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .8}" fill="${col}"/>
        <ellipse cx="${size * 1.2}" cy="${-size * .3}" rx="${size * .4}" ry="${size * .35}" fill="${col}"/>
        <ellipse cx="${-size * .9}" cy="${size * .2}" rx="${size * .3}" ry="${size * .25}" fill="${col}" opacity=".6"/>
        <path d="M ${size * 1.4} ${size * .2} L ${size * 1.7} ${size * .7}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="oo-wrap">
        <div class="oo-head"><b>OUTCROPS</b><span>露头=配额窗 宽=用量 旱獭=会话${hotN ? " · " + hotN + " 燃面" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${slope}${ground}${grass}${crops}${marmots}
          <g class="oo-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="oo-k">${fmt(k.tokens)} · ${sessions.length} 獭</text>
            <text x="22" y="45" class="oo-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "露头", eyebrow: "OUTCROPS", render };
})();
