/* --------------------------------------------------------------- distillery
 * Distillery — a row of column stills: every quota window is
 * a copper still (vapour column height/condenser glow = used%,
 * ≥85% the condensate drips amber); sessions are distillers
 * (a cap + still arm) running the line.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "distillery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const stills = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c08840";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const stillY = floorY - 14;
      const stillW = bw - 22, potH = 20, colH = 8 + f * 30;
      // column still: pot at bottom, column rising, condenser at top
      return `<g class="di-still${hot ? " hot" : ""}">
        <!-- pot -->
        <ellipse cx="${x}" cy="${stillY - potH / 2}" rx="${stillW / 2}" ry="${potH / 2}" fill="#8a5030" stroke="${hot ? "var(--amber)" : "#5a3820"}" stroke-width="${hot ? 1.4 : 1}"/>
        <ellipse cx="${x}" cy="${stillY - potH}" rx="${stillW / 2}" ry="4" fill="#6a4028"/>
        <!-- column -->
        <rect x="${x - stillW / 4}" y="${stillY - potH - colH}" width="${stillW / 2}" height="${colH}" fill="#9a6038" stroke="${hot ? "var(--amber)" : "#6a4a30"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- plates -->
        ${Array.from({ length: 3 }, (_, pi) => `<line x1="${x - stillW / 4}" y1="${(stillY - potH - colH * (pi + 1) / 4).toFixed(1)}" x2="${x + stillW / 4}" y2="${(stillY - potH - colH * (pi + 1) / 4).toFixed(1)}" stroke="#5a3820" stroke-width="1"/>`).join("")}
        <!-- vapour glow -->
        <rect x="${x - stillW / 4 + 2}" y="${stillY - potH - colH}" width="${stillW / 2 - 4}" height="${colH}" fill="${col}" opacity="${(0.2 + f * 0.35).toFixed(2)}"/>
        <!-- condenser arm + drip -->
        <line x1="${x + stillW / 4}" y1="${stillY - potH - colH + 4}" x2="${x + stillW / 2 + 8}" y2="${stillY - potH - colH + 10}" stroke="#8a5030" stroke-width="3" stroke-linecap="round"/>
        ${hot ? `<circle cx="${x + stillW / 2 + 8}" cy="${stillY - potH - colH + 14}" r="2" fill="var(--amber)">
          <animate attributeName="cy" values="${stillY - potH - colH + 14};${stillY}" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0" dur="1.2s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${stillY + 12}" class="di-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${stillY + 21}" class="di-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x - stillW / 2 + 4}" cy="${stillY - potH - colH - 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // distillers — cap + still arm
    const distillers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0d0b0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="di-worker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="8" y2="-9" stroke="${col}" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="di-wrap">
        <div class="di-head"><b>DISTILLERY</b><span>蒸馏柱=配额窗 汽柱=用量 冷凝=过热 技师=会话${hotN ? " · " + hotN + " 提馏" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${stills}${distillers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="di-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="di-ksub" text-anchor="end">横隔=塔板</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蒸馏厂", eyebrow: "DISTILLERY", render };
})();
