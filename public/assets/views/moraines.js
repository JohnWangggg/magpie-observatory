/* ------------------------------------------------------------------ moraines
 * Moraines — boulder trains left by a retreating glacier:
 * every quota window is a moraine ridge whose height = used %
 * (≥85% the erratic boulder burns amber); sessions are marmots
 * whistling from the rocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "moraines";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(27437799);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // glacial valley sky
    const sky = `<defs><linearGradient id="md-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8b8c8"/><stop offset="100%" stop-color="#c8d4d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#md-s)" rx="10"/>`;
    // glacier tongue in the back
    const glacier = `<path d="M 0 ${GY} L 0 ${GY - 60} L 60 ${GY - 80} L 130 ${GY - 62} L 200 ${GY - 85} L 270 ${GY - 68} L 340 ${GY - 80} L 400 ${GY - 75} L 400 ${GY} Z" fill="#c0d4dc" opacity=".4"/>`;
    // crevasses on the glacier
    const crev = `<path d="M 120 ${GY - 70} L 140 ${GY - 68} M 200 ${GY - 75} L 225 ${GY - 72} M 300 ${GY - 74} L 320 ${GY - 70}" stroke="#88a8b8" stroke-width="1" opacity=".5"/>`;
    // valley floor
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #808878 60%, var(--card-2))"/>`;
    // scattered till
    let till = "";
    for (let i = 0; i < 14; i++) {
      till += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 4 + rnd() * 35).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 8 + rnd() * 35).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 12 + rnd() * 35).toFixed(1)}" fill="#909888" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }

    // moraine ridges — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const ridges = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#787868";
      const rh = 15 + f * 65;
      const rw = 14 + f * 24;
      const topY = GY - rh;
      // ridge — rubble mound
      const ridge = `<path d="M ${cx - rw / 2} ${GY} L ${cx - rw * .35} ${topY + 10} L ${cx} ${topY} L ${cx + rw * .35} ${topY + 8} L ${cx + rw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 65%, #686858)"/>`;
      // boulders on the ridge
      const rockN = Math.round(3 + f * 6);
      let rocks = "";
      for (let r = 0; r < rockN; r++) {
        const rx = cx + (rnd() - .5) * rw * .8;
        const ry = topY + 5 + rnd() * (rh - 15);
        rocks += `<polygon points="${(rx - 2).toFixed(1)},${ry.toFixed(1)} ${(rx + 2).toFixed(1)},${(ry - 1.5).toFixed(1)} ${(rx + 3).toFixed(1)},${(ry + 1.5).toFixed(1)} ${(rx - 1).toFixed(1)},${(ry + 2).toFixed(1)}" fill="color-mix(in srgb, ${col} 75%, #585848)" opacity="${(.6 + rnd() * .2).toFixed(2)}"/>`;
      }
      // erratic boulder at the crest
      const erratic = `<polygon points="${cx - 4},${topY} ${cx + 4},${topY - 2} ${cx + 5},${topY + 3} ${cx - 3},${topY + 4}" fill="${hot ? "var(--amber)" : "color-mix(in srgb, " + col + " 80%, #505040)"}" opacity="${hot ? ".85" : ".9"}"/>`;
      const glow = hot ? `<circle cx="${cx + 1}" cy="${topY + 1}" r="7" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.05" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="md-ridge${hot ? " hot" : ""}">
        ${ridge}${rocks}${erratic}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="md-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="md-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // marmots — whistling from the rocks
    const marmots = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length)) - 12;
      const y = GY - (15 + (row ? Math.min(1, row.used / 100) : 0) * 65) * .4;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#988058");
      const rx2 = 6 + rnd() * 6;
      return `<g class="md-marm${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y.toFixed(1)} L ${(cx2 + rx2).toFixed(1)} ${(y - 4).toFixed(1)} L ${(cx2 - rx2).toFixed(1)} ${y.toFixed(1)}"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .6}" fill="${col}"/>
        <circle cx="${size * .5}" cy="${-size * .4}" r="${size * .4}" fill="${col}"/>
        <circle cx="${size * .4}" cy="${-size * .65}" r="${size * .12}" fill="${col}"/>
        <circle cx="${size * .65}" cy="${-size * .65}" r="${size * .12}" fill="${col}"/>
        <path d="M ${-size * .6} ${size * .4} Q ${-size * 1.1} ${size * .7} ${-size * 1.3} ${size * .4}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="md-wrap">
        <div class="md-head"><b>MORAINES</b><span>冰碛=配额窗 丘高=用量 旱獭=会话${hotN ? " · " + hotN + " 燃石" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${glacier}${crev}${ground}${till}${ridges}${marmots}
          <g class="md-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="md-k">${fmt(k.tokens)} · ${sessions.length} 獭</text>
            <text x="22" y="45" class="md-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰碛", eyebrow: "MORAINES", render };
})();
