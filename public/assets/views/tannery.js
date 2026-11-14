/* ------------------------------------------------------------------ tannery
 * Tannery — a yard of tanning pits: every quota window is a
 * pit (liquor level/bubble = used%, ≥85% the rim glows amber);
 * sessions are tanners (a cap + hide on back) walking the
 * pits with poles.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tannery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 48, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const pits = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a07040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const pitY = floorY - 8;
      const pitR = Math.min(bw / 2 - 10, 24);
      const pitH = 14 + f * 10;
      // pit = elliptical hole with liquor fill
      const liqY = pitY - pitH * .3;
      const bubbles = Math.round(f * 3);
      const bubbleEls = Array.from({ length: bubbles }, (_, bi) => {
        const bx = x - pitR / 3 + (bi * pitR / Math.max(1, bubbles));
        const dur = (1.6 + bi * 0.3).toFixed(1);
        return `<circle cx="${bx.toFixed(1)}" cy="${liqY}" r="${1 + f * 2}" fill="${col}" opacity=".6">
          <animate attributeName="cy" values="${liqY};${liqY - 8};${liqY}" dur="${dur}s" begin="${(-bi * 0.4).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".6;.15;.6" dur="${dur}s" begin="${(-bi * 0.4).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }).join("");
      return `<g class="ta-pit${hot ? " hot" : ""}">
        <!-- pit -->
        <ellipse cx="${x}" cy="${pitY}" rx="${pitR}" ry="${pitR * .35}" fill="#3a2a1a" stroke="${hot ? "var(--amber)" : "#5a4028"}" stroke-width="${hot ? 1.4 : .8}"/>
        <ellipse cx="${x}" cy="${pitY}" rx="${pitR - 4}" ry="${pitR * .35 - 3}" fill="#241a10"/>
        <ellipse cx="${x}" cy="${pitY - pitH * .15}" rx="${pitR - 6}" ry="${(pitR * .35 - 4).toFixed(1)}" fill="${col}" opacity="${(0.3 + f * 0.5).toFixed(2)}"/>
        ${bubbleEls}
        <!-- hide on the rim -->
        <path d="M${x - pitR + 2} ${pitY - 2} Q${x - pitR + 6} ${pitY - 10} ${x - pitR + 12} ${pitY - 6} L${x - pitR + 10} ${pitY + 2} Z" fill="${col}" opacity=".7"/>
        <text x="${x}" y="${pitY + 18}" class="ta-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${pitY + 27}" class="ta-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + pitR - 2}" cy="${pitY - 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // tanners — cap + hide on back + pole
    const tanners = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="ta-tanner${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M-6 -6 L-10 -10 L-8 -12 L-4 -8 Z" fill="${col}" opacity=".7"/>
        <line x1="4" y1="-4" x2="11" y2="-12" stroke="${col}" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ta-wrap">
        <div class="ta-head"><b>TANNERY</b><span>鞣池=配额窗 液位=用量 泡腾=过热 鞣工=会话${hotN ? " · " + hotN + " 满池" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${pits}${tanners}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="ta-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ta-ksub" text-anchor="end">池沿=生皮</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞣革坊", eyebrow: "TANNERY", render };
})();
