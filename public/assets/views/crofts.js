/* ------------------------------------------------------------------ crofts
 * Crofts — stone cottages on a Highland hillside: every quota
 * window is a croft whose chimney height = used % (≥85% the
 * hearth glows amber); sessions are sheep grazing the plot.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "crofts";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77668899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // highland sky
    const sky = `<defs><linearGradient id="cu-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8b8c8"/><stop offset="100%" stop-color="#c8d0d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cu-s)" rx="10"/>`;
    // moor hills
    const hills = `<path d="M 0 ${GY} L 0 ${GY - 50} L 60 ${GY - 65} L 130 ${GY - 45} L 200 ${GY - 70} L 270 ${GY - 52} L 340 ${GY - 65} L 400 ${GY - 60} L 400 ${GY} Z" fill="#7888a0" opacity=".3"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #687858 60%, var(--card-2))"/>`;
    // stone walls
    let walls = "";
    for (let i = 0; i < 5; i++) {
      walls += `<line x1="${(20 + i * 75).toFixed(1)}" y1="${GY + 8}" x2="${(55 + i * 75).toFixed(1)}" y2="${GY + 6}" stroke="#7888a0" stroke-width="1.5" opacity=".5"/>`;
    }

    // crofts — chimney height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const crofts = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7888a0";
      const ch = 15 + f * 60;
      const cw = 15 + f * 20;
      const topY = GY - ch;
      // stone body
      const body = `<rect x="${cx - cw / 2}" y="${topY + 15}" width="${cw}" height="${ch - 15}" fill="color-mix(in srgb, ${col} 50%, #585848)"/>`;
      // roof — thatched or slate
      const roof = `<path d="M ${cx - cw * .55} ${topY + 15} L ${cx} ${topY} L ${cx + cw * .55} ${topY + 15} Z" fill="color-mix(in srgb, ${col} 55%, #5a5a4a)"/>`;
      // chimney
      const chim = `<rect x="${cx - cw * .2}" y="${topY - 8}" width="${cw * .15}" height="12" fill="color-mix(in srgb, ${col} 60%, #484838)"/>`;
      // windows
      const win1 = `<rect x="${cx - cw * .35}" y="${topY + 25}" width="6" height="7" fill="#f0e8b8" opacity=".6"/>`;
      const win2 = `<rect x="${cx + cw * .15}" y="${topY + 28}" width="5" height="6" fill="#e8d8a0" opacity=".5"/>`;
      // door
      const door = `<rect x="${cx - 2}" y="${topY + 32}" width="5" height="10" fill="#383838"/>`;
      // smoke from chimney
      const smoke = hot ? `<path d="M ${cx - cw * .15} ${topY - 10} Q ${cx - cw * .1} ${topY - 20} ${cx + cw * .05} ${topY - 30} Q ${cx + cw * .15} ${topY - 40} ${cx + cw * .2} ${topY - 50}" stroke="var(--amber)" stroke-width="1" fill="none" opacity=".5">
        <animate attributeName="opacity" values=".5;.1;.5" dur="3s" repeatCount="indefinite"/></path>` : "";
      return `<g class="cu-croft${hot ? " hot" : ""}">
        ${body}${roof}${chim}${win1}${win2}${door}${smoke}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="cu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="cu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sheep — grazing
    const sheep = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 3) * 8;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e0");
      const startX = -15 + rnd() * 30;
      const endX = W - 15 + rnd() * 30;
      return `<g class="cu-sheep${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${startX.toFixed(1)} ${y};${endX.toFixed(1)} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * 1.1}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .8}" cy="${-size * .25}" r="${size * .3}" fill="${col}"/>
        <path d="M ${size * 1} ${-size * .2} L ${size * 1.4} ${-size * .5}" stroke="#585858" stroke-width=".6" fill="none"/>
        <line x1="${size * .4}" y1="${size * .4}" x2="${size * .4}" y2="${size * 1.2}" stroke="#585858" stroke-width=".4"/>
        <line x1="${-size * .4}" y1="${size * .4}" x2="${-size * .4}" y2="${size * 1.2}" stroke="#585858" stroke-width=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cu-wrap">
        <div class="cu-head"><b>CROFTS</b><span>石屋=配额窗 烟囱=用量 羊群=会话${hotN ? " · " + hotN + " 燃火" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hills}${ground}${walls}${crofts}${sheep}
          <g class="cu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cu-k">${fmt(k.tokens)} · ${sessions.length} 羊</text>
            <text x="22" y="45" class="cu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石屋", eyebrow: "CROFTS", render };
})();
