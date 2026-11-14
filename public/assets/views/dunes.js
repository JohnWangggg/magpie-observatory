/* ------------------------------------------------------------------ dunes
 * Dunes — wind-rippled sand mountains in a erg: every quota
 * window is a dune whose crest height = used % (≥85% the
 * summit glows amber); sessions are scarabs rolling across.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dunes";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // desert sky
    const sky = `<defs><linearGradient id="da-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8a060"/><stop offset="100%" stop-color="#e0c090"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#da-s)" rx="10"/>`;
    // far dune
    const far = `<path d="M 0 ${GY} L 0 ${GY - 20} L 80 ${GY - 35} L 160 ${GY - 18} L 240 ${GY - 40} L 320 ${GY - 25} L 400 ${GY - 32} L 400 ${GY} Z" fill="#b08858" opacity=".3"/>`;
    // sand plain
    const plain = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #c8a878 65%, var(--card-2))"/>`;
    // ripple texture
    let ripples = "";
    for (let i = 0; i < 12; i++) {
      ripples += `<path d="M ${i * 35} ${GY + 10} Q ${i * 35 + 15} ${GY + 14} ${i * 35 + 30} ${GY + 10}" stroke="#a08058" stroke-width=".7" fill="none" opacity=".25"/>`;
    }

    // dunes — crest height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const dunes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#b08858";
      const dh = 20 + f * 70;
      const dw = 20 + f * 35;
      const topY = GY - dh;
      // dune — asymmetrical (steeper windward side)
      const body = `<path d="M ${cx - dw / 2} ${GY} Q ${cx - dw * .2} ${topY + 8} ${cx} ${topY} Q ${cx + dw * .15} ${topY + 5} ${cx + dw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #b09870)"/>`;
      // crest highlight
      const crest = `<path d="M ${cx - dw * .3} ${topY + 12} Q ${cx - dw * .05} ${topY - 3} ${cx + dw * .2} ${topY + 8}" stroke="#d0b888" stroke-width="1.5" fill="none" opacity=".4"/>`;
      // hot amber summit
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${dw * .3}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${dw * .3};${dw * .55}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="da-dune${hot ? " hot" : ""}">
        ${body}${crest}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="da-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="da-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // scarabs — rolling across
    const scarabs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 2) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#3a2a1a");
      return `<g class="da-bug${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.2}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="${-size * .2}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <line x1="${-size * .8}" y1="${size * .2}" x2="${-size * 1.3}" y2="${size * .6}" stroke="${col}" stroke-width=".5"/>
        <line x1="${size * .8}" y1="${size * .2}" x2="${size * 1.3}" y2="${size * .6}" stroke="${col}" stroke-width=".5"/>
        <ellipse cx="${-size * .5}" cy="${size * .1}" rx="${size * .2}" ry="${size * .15}" fill="${col}" opacity=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="da-wrap">
        <div class="da-head"><b>DUNES</b><span>沙山=配额窗 高=用量 甲虫=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${far}${plain}${ripples}${dunes}${scarabs}
          <g class="da-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="da-k">${fmt(k.tokens)} · ${sessions.length} 虫</text>
            <text x="22" y="45" class="da-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沙丘", eyebrow: "DUNES", render };
})();
