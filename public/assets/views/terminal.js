/* ------------------------------------------------------------------ terminal
 * Terminal — a grand rail terminus: every quota window is a
 * platform (departure board glow + train steam = used%, ≥85%
 * the buffer light burns amber); sessions are porters (a cap
 * + trolley) on the concourse.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "terminal";
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
    const platY = TOP + bh - 14;

    // roof arches
    const arches = `<path d="M10 ${platY} Q ${W / 2} ${TOP - 30} ${W - 10} ${platY}" fill="none" stroke="#2a3038" stroke-width="2" opacity=".5"/>
      <path d="M30 ${platY} Q ${W / 2} ${TOP - 14} ${W - 30} ${platY}" fill="none" stroke="#2a3038" stroke-width="1.5" opacity=".4"/>`;

    const platforms = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e0b040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const boardW = bw - 14, boardH = 12;
      const boardY = TOP;
      const glowO = 0.25 + f * 0.65;
      const trainW = bw - 18, trainH = 14;
      const steam = hot ? `<ellipse cx="${x + trainW / 4}" cy="${platY - trainH - 8}" rx="4" ry="2" fill="#cfd8dc" opacity=".5">
          <animate attributeName="cy" values="${platY - trainH - 8};${platY - trainH - 18};${platY - trainH - 8}" dur="2.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".5;.1;.5" dur="2.5s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="tt-plat${hot ? " hot" : ""}">
        <!-- departure board -->
        <rect x="${x - boardW / 2}" y="${boardY}" width="${boardW}" height="${boardH}" rx="2" fill="#1a2128" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x - boardW / 2 + 3}" y="${boardY + 3}" width="${(boardW - 6) * f}" height="6" fill="${col}" opacity="${glowO.toFixed(2)}"/>
        <text x="${x}" y="${boardY + 9}" class="tt-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <!-- platform edge -->
        <line x1="${x - bw / 2 + 6}" y1="${platY}" x2="${x + bw / 2 - 6}" y2="${platY}" stroke="#4a4038" stroke-width="2"/>
        <!-- train on platform -->
        <rect x="${x - trainW / 2}" y="${platY - trainH}" width="${trainW}" height="${trainH}" rx="2" fill="#3a4858" stroke="${hot ? "var(--amber)" : "#2a3848"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x - trainW / 2 + 4}" y="${platY - trainH + 3}" width="${trainW - 8}" height="4" fill="${col}" opacity=".7"/>
        ${steam}
        <!-- buffer light -->
        <circle cx="${x + bw / 2 - 10}" cy="${platY + 4}" r="2" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>
        <text x="${x}" y="${platY + 18}" class="tt-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // porters — cap + trolley
    const porters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = platY - 4 - (i % 2) * 3;
      return `<g class="tt-porter${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="4" y="-3" width="10" height="6" rx="1" fill="#4a4038"/>
        <circle cx="7" cy="4" r="2" fill="#2a3038"/>
        <circle cx="12" cy="4" r="2" fill="#2a3038"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tt-wrap">
        <div class="tt-head"><b>TERMINAL</b><span>站台=配额窗 告牌=用量 蒸汽=过热 搬运工=会话${hotN ? " · " + hotN + " 末班" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14181e" rx="10"/>
          ${arches}${platforms}${porters}
          <rect x="0" y="${platY + 8}" width="${W}" height="${BOT - 8}" fill="#1c242c"/>
          <text x="16" y="${H - 18}" class="tt-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="tt-ksub" text-anchor="end">缓冲灯=到点</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "终点站", eyebrow: "TERMINAL", render };
})();
