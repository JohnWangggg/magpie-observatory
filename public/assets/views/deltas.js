/* ------------------------------------------------------------------ deltas
 * Deltas — braided river channels fanning into the sea: every
 * quota window is a channel braid whose width = used %
 * (≥85% the delta buoy burns amber); sessions are pelicans
 * skimming the outflow.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "deltas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(16337799);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SY = 80, GY = 250;

    // delta sky
    const sky = `<defs><linearGradient id="dd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c0d0d8"/><stop offset="100%" stop-color="#e0e0d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dd-s)" rx="10"/>`;
    // open sea at the top
    const sea = `<rect x="0" y="0" width="${W}" height="${SY}" fill="color-mix(in srgb, #4878a0 60%, var(--card-2))"/>`;
    // sea horizon shimmer
    const shimmer = `<line x1="0" y1="${SY}" x2="${W}" y2="${SY}" stroke="#a8d0e0" stroke-width="1.5" opacity=".5"/>`;
    // delta plain
    const plain = `<path d="M 0 ${GY} L 0 ${SY + 20} Q ${W / 2} ${SY + 5} ${W} ${SY + 20} L ${W} ${GY} Z" fill="color-mix(in srgb, #a89870 60%, var(--card-2))"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #988860 60%, var(--card-2))"/>`;
    // sedge patches
    let sedge = "";
    for (let i = 0; i < 12; i++) {
      sedge += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(SY + 30 + rnd() * (GY - SY - 50)).toFixed(1)}" rx="${(4 + rnd() * 8).toFixed(1)}" ry="${(2 + rnd() * 3).toFixed(1)}" fill="#788858" opacity="${(.35 + rnd() * .2).toFixed(2)}"/>`;
    }

    // braided channels — width = used %
    const n = Math.max(1, quotas.length);
    const channels = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4888a8";
      const cw = 4 + f * 18;
      // channel: starts at apex top center, fans out to sea edge
      const startX = W / 2;
      const startY = SY + 15;
      const endX = 30 + ((i + .5) / n) * (W - 60);
      const endY = SY - 5;
      const midX = (startX + endX) / 2 + (i % 2 ? 20 : -20);
      const midY = (startY + endY) / 2 + 15;
      const ch = `<path d="M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY + 40}" stroke="color-mix(in srgb, ${col} 70%, #386078)" stroke-width="${cw}" fill="none" opacity=".75" stroke-linecap="round"/>`;
      // water shine
      const shine = `<path d="M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY + 40}" stroke="#90c0d8" stroke-width="${cw * .3}" fill="none" opacity=".3"/>`;
      // buoy at channel mouth
      const buoy = `<line x1="${endX}" y1="${endY + 40}" x2="${endX}" y2="${endY + 28}" stroke="#685848" stroke-width="1.5"/>
        <circle cx="${endX}" cy="${endY + 25}" r="${hot ? 4 : 2.5}" fill="${hot ? "var(--amber)" : "#c05040"}"/>`;
      const glow = hot ? `<circle cx="${endX}" cy="${endY + 25}" r="8" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="8;12" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // pct at delta base
      return `<g class="dd-chan${hot ? " hot" : ""}">
        ${ch}${shine}${buoy}${glow}
        <text x="${endX.toFixed(1)}" y="${GY + 20}" class="dd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${endX.toFixed(1)}" y="${GY + 31}" class="dd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pelicans — skimming the outflow
    const pelicans = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 13);
      const y = 40 + (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e0d0");
      return `<g class="dd-pel${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .45}" fill="${col}"/>
        <path d="M ${size * .8} ${-size * .1} L ${size * 1.9} ${size * .1} L ${size * 1.9} ${size * .3} L ${size * .8} ${size * .2} Z" fill="${col}"/>
        <ellipse cx="${-size * .3}" cy="${-size * .3}" rx="${size * .8}" ry="${size * .2}" fill="${col}" opacity=".8"/>
        <path d="M ${-size * 1.1} 0 L ${-size * 1.8} ${-size * .4} L ${-size * 1.8} ${size * .4} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dd-wrap">
        <div class="dd-head"><b>DELTAS</b><span>汊道=配额窗 宽=用量 鹈鹕=会话${hotN ? " · " + hotN + " 燃标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${shimmer}${plain}${ground}${sedge}${channels}${pelicans}
          <g class="dd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="dd-k">${fmt(k.tokens)} · ${sessions.length} 鹈</text>
            <text x="22" y="45" class="dd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "三角洲", eyebrow: "DELTAS", render };
})();
