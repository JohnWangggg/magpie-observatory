/* ------------------------------------------------------------------ interchange
 * Interchange — a stacked freeway stack: every quota window
 * is a flyover ramp (deck height + lamp = used%, ≥85% the
 * beacon burns amber); sessions are cars flowing the loops.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "interchange";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 54, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const ramps = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0a0b0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const rampY = floorY - 16;
      const rampW = bw - 12;
      const deckH = 8 + f * 14;
      // pillars
      const pillars = Array.from({ length: Math.round(1 + f * 3) }, (_, pi) => {
        const px = x - rampW / 2 + 6 + pi * (rampW - 12) / Math.max(1, Math.round(f * 3));
        return `<line x1="${px.toFixed(1)}" y1="${rampY}" x2="${px.toFixed(1)}" y2="${rampY + deckH}" stroke="#4a4048" stroke-width="2"/>`;
      }).join("");
      // deck
      const deck = `<path d="M${x - rampW / 2} ${rampY - deckH} L${x + rampW / 2} ${rampY - deckH}" stroke="${col}" stroke-width="4" opacity="${(0.5 + f * 0.4).toFixed(2)}"/>`;
      // lamps
      const lamp = `<circle cx="${x}" cy="${rampY - deckH - 6}" r="2" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="2;3.5;2" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="io-ramp${hot ? " hot" : ""}">
        ${pillars}${deck}${lamp}
        <text x="${x}" y="${rampY - deckH - 12}" class="io-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${rampY + 14}" class="io-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // cars — flowing the loops
    const cars = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a0a0c0");
      const dur = Math.max(8, 16 - (s.tps || 0) / 12);
      const y = floorY - 20 - (i % 3) * 10;
      return `<g class="io-car${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-14} ${y.toFixed(1)};${W + 14} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <rect x="-4" y="-3" width="8" height="4" rx="1" fill="${col}"/>
        <circle cx="-2" cy="1" r="1.5" fill="#2a3038"/>
        <circle cx="2" cy="1" r="1.5" fill="#2a3038"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="io-wrap">
        <div class="io-head"><b>INTERCHANGE</b><span>匝道=配额窗 墩高=用量 灯=过热 车流=会话${hotN ? " · " + hotN + " 绕" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141418" rx="10"/>
          ${ramps}${cars}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c1c22"/>
          <text x="16" y="${H - 18}" class="io-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="io-ksub" text-anchor="end">叠层=高架</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "立交桥", eyebrow: "INTERCHANGE", render };
})();
