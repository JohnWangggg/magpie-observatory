/* ------------------------------------------------------------------ moorland
 * Moorland — heather-covered hills under a grey sky: every
 * quota window is a moor ridge whose height = used % (≥85% the
 * cairn burns amber); sessions are hares bounding over the bog.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "moorland";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33224455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // grey moor sky
    const sky = `<defs><linearGradient id="ml-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8b8c8"/><stop offset="100%" stop-color="#d0d0d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ml-s)" rx="10"/>`;
    // distant hill
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 45} L 60 ${GY - 60} L 130 ${GY - 42} L 200 ${GY - 65} L 270 ${GY - 48} L 340 ${GY - 60} L 400 ${GY - 55} L 400 ${GY} Z" fill="#9898a8" opacity=".3"/>`;
    // heather ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #8878a0 55%, var(--card-2))"/>`;
    // heather tufts
    let heather = "";
    for (let i = 0; i < 18; i++) {
      heather += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 40).toFixed(1)}" r="${(1 + rnd() * 2).toFixed(1)}" fill="#a088b8" opacity="${(.3 + rnd() * .3).toFixed(2)}"/>`;
    }

    // moor ridges — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const ridges = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8878a0";
      const rh = 15 + f * 70;
      const rw = 12 + f * 22;
      const topY = GY - rh;
      // rolling hill face
      const face = `<path d="M ${cx - rw} ${GY} Q ${cx - rw * .4} ${topY} ${cx} ${topY - 5} Q ${cx + rw * .5} ${topY + 3} ${cx + rw} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #787890)"/>`;
      // heather on the ridge
      const heath = `<ellipse cx="${cx - rw * .2}" cy="${topY + 5}" rx="${rw * .35}" ry="4" fill="#a088b8" opacity=".5"/>`;
      // cairn at the top
      const cairn = `<circle cx="${cx}" cy="${topY - 5}" r="3.5" fill="#9898a0"/><circle cx="${cx}" cy="${topY - 9}" r="2.8" fill="#888890"/><circle cx="${cx}" cy="${topY - 12}" r="2" fill="#787878"/>`;
      // hot amber fire on cairn
      const fire = hot ? `<path d="M ${cx} ${topY - 12} L ${cx - 2} ${topY - 18} Q ${cx} ${topY - 22} ${cx + 2} ${topY - 18} Z" fill="var(--amber)" opacity=".7">
        <animate attributeName="opacity" values=".7;.3;.7" dur="1.2s" repeatCount="indefinite"/></path>` : "";
      return `<g class="ml-ridge${hot ? " hot" : ""}">
        ${face}${heath}${cairn}${fire}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ml-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ml-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // hares — bounding over the bog
    const hares = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 13 - (s.tps || 0) / 13);
      const y = GY + 15 + (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a89080");
      return `<g class="ml-hare${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${size * .7} ${-size * .2} L ${size * 1.3} ${-size * .8}" stroke="${col}" stroke-width="1.2" fill="none"/>
        <ellipse cx="${size * .8}" cy="${-size * .3}" rx="${size * .3}" ry="${size * .2}" fill="${col}"/>
        <path d="M ${-size * .9} ${size * .2} L ${-size * 1.6} ${size * .8}" stroke="${col}" stroke-width=".7" fill="none"/>
        <path d="M ${-size * .3} ${size * .3} L ${-size * .5} ${size * 1}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ml-wrap">
        <div class="ml-head"><b>MOORLAND</b><span>荒原=配额窗 丘高=用量 野兔=会话${hotN ? " · " + hotN + " 燃堆" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${heather}${ridges}${hares}
          <g class="ml-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ml-k">${fmt(k.tokens)} · ${sessions.length} 兔</text>
            <text x="22" y="45" class="ml-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "荒原", eyebrow: "MOORLAND", render };
})();
