/* ------------------------------------------------------------------ jungle
 * Jungle — a dense rainforest canopy at noon: every quota window is
 * a hanging liana whose drop-length = used % (≥85% the tip flowers
 * amber); sessions are parrots flashing through the understory.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "jungle";
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

    // dense green backdrop
    const backdrop = `<defs><linearGradient id="jg-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d2015"/><stop offset="60%" stop-color="#1a3020"/><stop offset="100%" stop-color="#253a28"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#jg-b)" rx="10"/>`;
    // canopy silhouette
    const canopy = `<path d="M 0 0 L 0 40 L 30 35 L 80 45 L 150 30 L 220 42 L 290 28 L 360 38 L 400 32 L 400 0 Z" fill="#0a1a10" opacity=".9"/>`;
    // mist
    const mist = `<rect x="0" y="${GY - 20}" width="${W}" height="40" fill="#1a3020" opacity=".3"/>`;
    // forest floor
    const floor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a2820 75%, var(--card-2))"/>`;
    // dappled light
    let dapple = "";
    for (let i = 0; i < 12; i++) {
      dapple += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 25).toFixed(1)}" rx="${(3 + rnd() * 8).toFixed(1)}" ry="${(1.5 + rnd() * 3).toFixed(1)}" fill="#4a7a5a" opacity="${(.08 + rnd() * .15).toFixed(2)}"/>`;
    }

    // lianas — hanging vine length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const vines = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#3a7a4a";
      const vl = 25 + f * 75;
      const vw = 3 + f * 5;
      const tipY = 40 + vl;
      // vine — twisting line
      const vine = `<path d="M ${cx} 40 Q ${cx - 8} ${40 + vl * .3} ${cx + 5} ${40 + vl * .6} Q ${cx + 8} ${40 + vl * .8} ${cx} ${tipY}" stroke="color-mix(in srgb, ${col} 65%, #2a4a30)" stroke-width="${vw}" fill="none" stroke-linecap="round"/>`;
      // leaves along the vine
      const leaf1 = `<ellipse cx="${cx + 6}" cy="${40 + vl * .25}" rx="4" ry="2" fill="${col}" opacity=".5"/>`;
      const leaf2 = `<ellipse cx="${cx - 5}" cy="${40 + vl * .5}" rx="3.5" ry="2" fill="${col}" opacity=".4"/>`;
      const leaf3 = `<ellipse cx="${cx + 4}" cy="${40 + vl * .75}" rx="3" ry="1.5" fill="${col}" opacity=".35"/>`;
      // tip flower
      const flower = hot ? `<circle cx="${cx}" cy="${tipY}" r="5" fill="var(--amber)" opacity=".8">
          <animate attributeName="r" values="5;7" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".8;.3" dur="2s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="jg-vine${hot ? " hot" : ""}">
        ${vine}${leaf1}${leaf2}${leaf3}${flower}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="jg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="jg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // parrots — sessions flashing through
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 15);
      const y = GY - 20 - (i % 3) * 15;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e04040");
      return `<g class="jg-bird${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 1.8} ${-size * .5} L ${-size * 1.8} ${size * .5} Z" fill="${col}"/>
        <circle cx="${size * 1.2}" cy="${-size * .2}" r="${size * .12}" fill="${col}" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="jg-wrap">
        <div class="jg-head"><b>JUNGLE</b><span>藤蔓=配额窗 垂长=用量 鹦鹉=会话${hotN ? " · " + hotN + " 开花" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${backdrop}${canopy}${mist}${floor}${dapple}${vines}${birds}
          <g class="jg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="jg-k">${fmt(k.tokens)} · ${sessions.length} 鹦</text>
            <text x="22" y="45" class="jg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雨林", eyebrow: "JUNGLE", render };
})();
