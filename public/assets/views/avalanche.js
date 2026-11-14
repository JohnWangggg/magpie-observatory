/* ---------------------------------------------------------------- avalanche
 * Avalanche — a mountain face with cornices: every quota window
 * is a snow cornice on the ridge (overhang/glow = used%, ≥85%
 * the cornice cracks amber); sessions are skiers (a head +
 * body) carving the slope below, dodging the sliding snow.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "avalanche";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 56, BOT = 40;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const ridgeY = TOP - 8;

    // mountain face silhouette
    const face = `<path d="M0 ${H} L0 ${ridgeY + 20} L${W * .35} ${ridgeY} L${W * .6} ${ridgeY + 14} L${W * .82} ${ridgeY + 6} L${W} ${ridgeY + 18} L${W} ${H} Z" fill="#c8d8e8"/>`;

    const cornices = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0c0e0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const cornW = bw - 16, cornH = 8 + f * 16;
      const cornY = ridgeY + 4 + (i % 2) * 4;
      // crack lines when hot
      const cracks = hot ? `<path d="M${x - cornW / 4} ${cornY} L${x - cornW / 8} ${cornY + cornH * .6} L${x} ${cornY + cornH * .3} L${x + cornW / 8} ${cornY + cornH * .8}" fill="none" stroke="var(--amber)" stroke-width="1.2"/>` : "";
      // snow debris falling
      const debris = hot ? `<circle cx="${x + cornW / 4}" cy="${cornY + cornH + 6}" r="2" fill="#e8f0f8" opacity=".7">
        <animate attributeName="cy" values="${cornY + cornH + 6};${H - BOT}" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;.1;.7" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="al-cornice${hot ? " hot" : ""}">
        <path d="M${x - cornW / 2} ${cornY} L${x + cornW / 2} ${cornY} L${x + cornW / 2 + 6} ${cornY + cornH} L${x - cornW / 2 + 4} ${cornY + cornH * .8} Z"
          fill="#f0f4f8" stroke="${hot ? "var(--amber)" : "#98b0c8"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${cracks}${debris}
        <text x="${x}" y="${cornY + cornH + 14}" class="al-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${cornY + cornH + 23}" class="al-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // skiers — head + body + ski lines carving the slope
    const skiers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#406080");
      const dur = Math.max(10, 20 - (s.tps || 0) / 10);
      const y = TOP + bh * .6 - (i % 2) * 10;
      return `<g class="al-skier${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${(y + 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3" fill="${col}"/>
        <rect x="-4" y="-6" width="8" height="8" rx="2" fill="${col}" opacity=".9"/>
        <line x1="-6" y1="4" x2="8" y2="4" stroke="${col}" stroke-width="1.8"/>
        <line x1="-4" y1="4" x2="2" y2="8" stroke="${col}" stroke-width="1.2"/>
        <line x1="2" y1="4" x2="6" y2="8" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="al-wrap">
        <div class="al-head"><b>AVALANCHE</b><span>雪檐=配额窗 裂崩=用量 滑手=会话${hotN ? " · " + hotN + " 裂" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141a22" rx="10"/>
          ${face}${cornices}${skiers}
          <text x="16" y="${H - 18}" class="al-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="al-ksub" text-anchor="end">裂纹=危檐</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雪崩", eyebrow: "AVALANCHE", render };
})();
