/* ------------------------------------------------------------------ castles
 * Castles — a row of stone fortresses on a hillside: every
 * quota window is a castle whose height = used % (≥85% the
 * battlement fires amber); sessions are knights on patrol.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "castles";
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

    // hill sky
    const sky = `<defs><linearGradient id="cl-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6a78"/><stop offset="100%" stop-color="#7a8a98"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cl-s)" rx="10"/>`;
    // hill
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 35} L 60 ${GY - 50} L 130 ${GY - 30} L 200 ${GY - 55} L 270 ${GY - 38} L 340 ${GY - 50} L 400 ${GY - 45} L 400 ${GY} Z" fill="#4a5248" opacity=".4"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #5a6058 65%, var(--card-2))"/>`;
    // grass tufts
    let grass = "";
    for (let i = 0; i < 12; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#4a5a40" stroke-width=".8" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // castles — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const castles = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a8a7a";
      const ch = 30 + f * 80;
      const cw = 15 + f * 25;
      const topY = GY - ch;
      // keep body
      const body = `<rect x="${cx - cw / 2}" y="${topY + 10}" width="${cw}" height="${ch - 10}" fill="color-mix(in srgb, ${col} 50%, #5a6058)"/>`;
      // towers flanking
      const tw = cw * .15;
      const towerL = `<rect x="${cx - cw * .45}" y="${topY + 15}" width="${tw}" height="${ch * .8}" fill="color-mix(in srgb, ${col} 60%, #4a5048)"/>`;
      const towerR = `<rect x="${cx + cw * .3}" y="${topY + 15}" width="${tw}" height="${ch * .8}" fill="color-mix(in srgb, ${col} 60%, #4a5048)"/>`;
      // crenellations
      const cren = `<rect x="${cx - cw * .4}" y="${topY - 5}" width="${tw * .6}" height="6" fill="${col}"/>
        <rect x="${cx - cw * .1}" y="${topY - 5}" width="${tw * .6}" height="6" fill="${col}"/>
        <rect x="${cx + cw * .2}" y="${topY - 5}" width="${tw * .6}" height="6" fill="${col}"/>`;
      // windows
      const win1 = `<rect x="${cx - cw * .3}" y="${topY + 25}" width="5" height="7" fill="#3a4038" opacity=".6"/>`;
      const win2 = `<rect x="${cx + cw * .1}" y="${topY + 35}" width="5" height="7" fill="#3a4038" opacity=".55"/>`;
      // flag
      const flag = `<line x1="${cx}" y1="${topY - 2}" x2="${cx}" y2="${topY - 12}" stroke="${col}" stroke-width="1"/><path d="M ${cx} ${topY - 12} L ${cx + 8} ${topY - 9} L ${cx} ${topY - 6} Z" fill="${hot ? "var(--amber)" : "#c0b8a8"}"/>`;
      // hot amber glow
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY - 5}" rx="${(5 + f * 3).toFixed(1)}" ry="4" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${(5 + f * 3).toFixed(1)};${(9 + f * 4).toFixed(1)}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="cl-castle${hot ? " hot" : ""}">
        ${body}${towerL}${towerR}${cren}${win1}${win2}${flag}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="cl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="cl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // knights — patrolling
    const knights = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 2) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#8a8a90");
      return `<g class="cl-knight${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .45}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .25}" r="${size * .2}" fill="${col}"/>
        <path d="M ${size * .8} ${size * .1} L ${size * 1.2} ${size * .6}" stroke="${col}" stroke-width=".5" fill="none"/>
        <path d="M ${-size * .5} ${size * .2} L ${-size * .9} ${size * .7}" stroke="${col}" stroke-width=".5" fill="none"/>
        <line x1="0" y1="0" x2="0" y2="${-size * .7}" stroke="${col}" stroke-width=".4" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cl-wrap">
        <div class="cl-head"><b>CASTLES</b><span>城堡=配额窗 高=用量 骑士=会话${hotN ? " · " + hotN + " 燃垛" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${grass}${castles}${knights}
          <g class="cl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cl-k">${fmt(k.tokens)} · ${sessions.length} 士</text>
            <text x="22" y="45" class="cl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "城堡群", eyebrow: "CASTLES", render };
})();
