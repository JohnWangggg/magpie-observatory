/* ------------------------------------------------------------------ pagodas
 * Pagodas — a row of tiered pagodas on a temple ridge: every
 * quota window is a pagoda whose tier count = used % (≥85% the
 * finial burns amber); sessions are swallows circling the eaves.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pagodas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11002233);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // dawn sky
    const sky = `<defs><linearGradient id="pg-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8d8c8"/><stop offset="100%" stop-color="#f8e8d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#pg-s)" rx="10"/>`;
    // distant hill
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 40} L 60 ${GY - 55} L 130 ${GY - 38} L 200 ${GY - 60} L 270 ${GY - 42} L 340 ${GY - 55} L 400 ${GY - 50} L 400 ${GY} Z" fill="#c8a888" opacity=".25"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b89878 55%, var(--card-2))"/>`;
    // mist band
    const mist = `<rect x="0" y="${GY - 15}" width="${W}" height="18" fill="#e0d0c0" opacity=".3" rx="4"/>`;

    // pagodas — tier count = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const pagodas = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b88868";
      const tiers = Math.max(2, Math.round(2 + f * 6));
      const baseW = 18 + f * 22;
      const baseH = GY;
      // each tier
      let tiersSvg = "";
      let curY = baseH;
      let curW = baseW;
      for (let t = 0; t < tiers; t++) {
        const tierH = 10 - t * .6;
        const eaveH = 5;
        // eave — flared
        tiersSvg += `<path d="M ${cx - curW / 2 - 8} ${curY} Q ${cx - curW / 2} ${curY - 3} ${cx - curW / 2 + 3} ${curY - 2} L ${cx + curW / 2 - 3} ${curY - 2} Q ${cx + curW / 2} ${curY - 3} ${cx + curW / 2 + 8} ${curY} Z" fill="color-mix(in srgb, ${col} ${55 - t * 4}%, #8a7868)"/>`;
        // tier body
        tiersSvg += `<rect x="${cx - curW / 2}" y="${curY - tierH - eaveH}" width="${curW}" height="${tierH}" fill="color-mix(in srgb, ${col} ${60 - t * 4}%, #988878)"/>`;
        curY -= tierH + eaveH + 1;
        curW *= .82;
      }
      // spire
      const spire = `<line x1="${cx}" y1="${curY}" x2="${cx}" y2="${curY - 10}" stroke="${col}" stroke-width="1.5"/><circle cx="${cx}" cy="${curY - 12}" r="${hot ? 4 : 2.5}" fill="${hot ? "var(--amber)" : col}"/>`;
      // hot finial glow
      const glow = hot ? `<circle cx="${cx}" cy="${curY - 12}" r="8" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="8;12" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.08" dur="2s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="pg-pag${hot ? " hot" : ""}">
        ${tiersSvg}${spire}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="pg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="pg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swallows — circling the eaves
    const swallows = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY - 30 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#2a3848");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 40 + rnd() * 60;
      const ry2 = 8 + rnd() * 12;
      return `<g class="pg-swallow${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <path d="M ${-size * 1.4} ${-size * .4} Q ${-size * .3} ${size * .5} ${size * .9} 0 Q ${size * .6} ${-size * .8} ${-size * .4} ${-size * .4} Z" fill="${col}"/>
        <path d="M ${size * .9} 0 L ${size * 1.6} ${-size * .5}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${-size * .4} ${-size * .4} L ${-size * .8} ${-size * 1}" stroke="${col}" stroke-width=".4" fill="none" opacity=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pg-wrap">
        <div class="pg-head"><b>PAGODAS</b><span>宝塔=配额窗 层数=用量 燕子=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${mist}${pagodas}${swallows}
          <g class="pg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pg-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="pg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "宝塔群", eyebrow: "PAGODAS", render };
})();
