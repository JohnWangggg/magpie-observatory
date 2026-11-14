/* ------------------------------------------------------------------ chimneys
 * Chimneys — brick chimney stacks on a cottage roofline:
 * every quota window is a chimney whose height = used %
 * (≥85% the smoke burns amber); sessions are sparrows
 * hopping along the ridge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "chimneys";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;

    // cottage sky
    const sky = `<defs><linearGradient id="ci-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b0a890"/><stop offset="100%" stop-color="#d0c0a0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ci-s)" rx="10"/>`;
    // cottage roofline
    const roof = `<path d="M 0 ${GY} L 0 ${GY - 20} L 40 ${GY - 35} L 80 ${GY - 15} L 130 ${GY - 40} L 180 ${GY - 20} L 230 ${GY - 45} L 280 ${GY - 18} L 330 ${GY - 38} L 400 ${GY - 25} L 400 ${GY} Z" fill="#6a5a48" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #8a7a68 65%, var(--card-2))"/>`;
    // roof tiles
    let tiles = "";
    for (let i = 0; i < 12; i++) {
      tiles += `<line x1="${(i * 35).toFixed(1)}" y1="${(GY + rnd() * 20).toFixed(1)}" x2="${(i * 35 + 15).toFixed(1)}" y2="${(GY + rnd() * 20).toFixed(1)}" stroke="#7a6a58" stroke-width=".8" opacity="${(.15 + rnd() * .1).toFixed(2)}"/>`;
    }

    // chimneys — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const chimneys = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a6a50";
      const ch = 25 + f * 80;
      const cw = 10 + f * 18;
      const topY = GY - ch;
      // chimney body — brick
      const body = `<rect x="${cx - cw / 2}" y="${topY}" width="${cw}" height="${ch}" fill="color-mix(in srgb, ${col} 55%, #7a5a40)"/>`;
      // brick lines
      const brick1 = `<line x1="${cx - cw * .4}" y1="${GY - ch * .3}" x2="${cx + cw * .4}" y2="${GY - ch * .3}" stroke="${col}" stroke-width="1" opacity=".4"/>`;
      const brick2 = `<line x1="${cx - cw * .4}" y1="${GY - ch * .6}" x2="${cx + cw * .4}" y2="${GY - ch * .6}" stroke="${col}" stroke-width="1" opacity=".35"/>`;
      const brick3 = `<line x1="${cx - cw * .4}" y1="${GY - ch * .85}" x2="${cx + cw * .4}" y2="${GY - ch * .85}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // pot on top
      const pot = `<rect x="${cx - cw * .35}" y="${topY - 5}" width="${cw * .7}" height="5" fill="color-mix(in srgb, ${col} 70%, #5a4030)"/>`;
      // smoke — puffs rising
      let smoke = "";
      const puffCount = 2 + Math.floor(f * 3);
      for (let p = 0; p < puffCount; p++) {
        const px = cx + (rnd() - .5) * cw * .3;
        const py = topY - 10 - p * 12;
        const pr = 2 + rnd() * 3;
        const rise = 15 + rnd() * 25;
        smoke += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${hot ? "var(--amber)" : "#b0a890"}" opacity="${(.2 + rnd() * .15).toFixed(2)}">
          <animate attributeName="cy" values="${py.toFixed(1)};${(py - rise).toFixed(1)}" dur="${(2 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="${pr.toFixed(1)};${(pr * 1.4).toFixed(1)}" dur="${(2 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(.2 + rnd() * .15).toFixed(2)};0" dur="${(2 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }
      return `<g class="ci-chim${hot ? " hot" : ""}">
        ${body}${brick1}${brick2}${brick3}${pot}${smoke}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ci-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ci-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sparrows — hopping along the ridge
    const sparrows = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY - 15 - (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a08a68");
      return `<g class="ci-sparrow${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .15}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <path d="M ${-size * 1.1} 0 L ${-size * 1.6} ${-size * .5} L ${-size * 1.6} ${size * .5} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ci-wrap">
        <div class="ci-head"><b>CHIMNEYS</b><span>烟囱=配额窗 高=用量 麻雀=会话${hotN ? " · " + hotN + " 燃烟" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${roof}${ground}${tiles}${chimneys}${sparrows}
          <g class="ci-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ci-k">${fmt(k.tokens)} · ${sessions.length} 雀</text>
            <text x="22" y="45" class="ci-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "烟囱", eyebrow: "CHIMNEYS", render };
})();
