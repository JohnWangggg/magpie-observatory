/* ------------------------------------------------------------------- loch
 * Loch — a still mountain tarn at dawn: every quota window is a
 * depth marker whose submersion = used % (≥85% the ring flashes
 * amber); sessions are swans drifting across the glass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "loch";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 224, WY = 238;

    // dawn mist
    let mist = "";
    for (let i = 0; i < 3; i++) {
      mist += `<path d="M ${-30 + i * 140} ${GY + 15 + i * 10} Q ${70 + i * 140} ${GY + 5 + i * 10} ${170 + i * 140} ${GY + 18 + i * 10} T ${400 + i * 80} ${GY + 14 + i * 10}" stroke="#7a8a9a" stroke-width="12" fill="none" opacity="${(.06 + rnd() * .1).toFixed(2)}" stroke-linecap="round"/>`;
    }
    // mountain backdrop
    const hills = `<path d="M 0 ${GY} L 60 ${GY - 40} L 140 ${GY - 25} L 220 ${GY - 50} L 310 ${GY - 30} L 400 ${GY - 45} L 400 ${GY} Z" fill="color-mix(in srgb, #2a3038 70%, transparent)" opacity=".8"/>`;
    // water — glass calm
    const water = `<rect x="0" y="${WY}" width="${W}" height="${H - WY}" fill="color-mix(in srgb, #1a2830 75%, var(--card-2))"/>`;
    // shoreline
    const shore = `<line x1="0" y1="${WY}" x2="${W}" y2="${WY}" stroke="#3a4a50" stroke-width=".8" opacity=".6"/>
      <path d="M 0 ${WY + 1} Q 100 ${WY + 4} 200 ${WY + 2} T 400 ${WY + 3}" stroke="#5a6a70" stroke-width=".6" fill="none" opacity=".4"/>`;
    // reeds at the edge
    let reeds = "";
    for (let i = 0; i < 6; i++) {
      const rx = 20 + i * 62;
      const rh = 8 + rnd() * 10;
      reeds += `<line x1="${rx}" y1="${WY + 4}" x2="${rx - 2 + rnd() * 4}" y2="${WY + 4 - rh}" stroke="#3a4a3a" stroke-width="1" opacity=".6"/>`;
    }

    // depth markers — submersion depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const markers = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#e8e0d0";
      // marker pole — above-water height shrinks as used grows
      const above = 20 - f * 16;
      const below = 8 + f * 30;
      const pole = `<line x1="${cx}" y1="${WY - above}" x2="${cx}" y2="${WY + below}" stroke="${hot ? "var(--amber)" : col}" stroke-width="2" opacity=".8" stroke-linecap="round"/>`;
      // ring at the waterline
      const ring = `<ellipse cx="${cx}" cy="${WY}" rx="${(4 + f * 4).toFixed(1)}" ry="${(1.5 + f * 1.5).toFixed(1)}" fill="none" stroke="${hot ? "var(--amber)" : col}" stroke-width="1" opacity=".7"/>`;
      // hot flash — expanding ring
      const flash = hot ? `<ellipse cx="${cx}" cy="${WY}" rx="${(4 + f * 4).toFixed(1)}" ry="${(1.5 + f * 1.5).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".5">
        <animate attributeName="rx" values="${(4 + f * 4).toFixed(1)};${(9 + f * 6).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${(1.5 + f * 1.5).toFixed(1)};${(3.5 + f * 2.5).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;0" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="lc-mark${hot ? " hot" : ""}">
        ${pole}${ring}${flash}
        <text x="${cx.toFixed(1)}" y="${WY + 20}" class="lc-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${WY + 31}" class="lc-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swans — sessions drifting across the glass
    const swans = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 18 - (s.tps || 0) / 11);
      const y = WY + 12 + (i % 2) * 8;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e8");
      return `<g class="lc-swan${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y};${W + 26} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .8}" fill="${col}"/>
        <path d="M ${size * .8} ${-size * .6} Q ${size * 1.2} ${-size * 2.2} ${size * .6} ${-size * 3.2} Q ${size * .2} ${-size * 2.4} ${size * .5} ${-size * .8}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="${size * .55}" cy="${-size * 3.1}" r="${size * .3}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lc-wrap">
        <div class="lc-head"><b>LOCH</b><span>深标=配额窗 深=用量 天鹅=会话${hotN ? " · " + hotN + " 琥珀" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #141a20 65%, transparent)" rx="10"/>
          ${hills}${water}${shore}${reeds}${mist}${markers}${swans}
          <g class="lc-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="lc-k">${fmt(k.tokens)} · ${sessions.length} 天鹅</text>
            <text x="22" y="45" class="lc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湖心", eyebrow: "LOCH", render };
})();
