/* ------------------------------------------------------------- conservatory
 * Conservatory — a glasshouse of potted plants under arched
 * ribs: every quota window is a pot whose plant height/leaf
 * spread = used% (≥85% the bloom burns amber); sessions are
 * gardeners (a hat + body) watering the rows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "conservatory";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 48, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // glasshouse ribs — three arches
    const ribs = [0.15, 0.5, 0.85].map(fx => {
      const x = W * fx;
      return `<path d="M${x - 60} ${floorY} Q ${x - 60} ${TOP - 20} ${x} ${TOP - 30} Q ${x + 60} ${TOP - 20} ${x + 60} ${floorY}" fill="none" stroke="#2a3038" stroke-width="1.5" opacity=".5"/>`;
    }).join("");

    const pots = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const potY = floorY - 12;
      const potW = 20, potH = 14;
      const stemH = 8 + f * 34;
      const leafR = 3 + f * 7;
      const bloomR = hot ? 5 : 3 + f * 4;
      return `<g class="cw-pot${hot ? " hot" : ""}">
        <!-- pot -->
        <path d="M${x - potW / 2} ${potY} L${x + potW / 2} ${potY} L${x + potW / 2 - 3} ${potY + potH} L${x - potW / 2 + 3} ${potY + potH} Z" fill="#3a2e20" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- stem -->
        <line x1="${x}" y1="${potY}" x2="${x}" y2="${potY - stemH}" stroke="${col}" stroke-width="1.6"/>
        <!-- leaves -->
        <ellipse cx="${x - leafR}" cy="${potY - stemH * .6}" rx="${leafR}" ry="${leafR * .5}" fill="${col}" opacity=".75" transform="rotate(-30 ${x - leafR} ${potY - stemH * .6})"/>
        <ellipse cx="${x + leafR}" cy="${potY - stemH * .75}" rx="${leafR}" ry="${leafR * .5}" fill="${col}" opacity=".75" transform="rotate(30 ${x + leafR} ${potY - stemH * .75})"/>
        <!-- bloom -->
        <circle cx="${x}" cy="${potY - stemH}" r="${bloomR}" fill="${col}">
          ${hot ? `<animate attributeName="r" values="${bloomR};${bloomR + 2};${bloomR}" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>
        ${hot ? `<circle cx="${x}" cy="${potY - stemH}" r="${bloomR + 3}" fill="var(--amber)" opacity=".4">
          <animate attributeName="r" values="${bloomR + 3};${bloomR + 6};${bloomR + 3}" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${potY + potH + 12}" class="cw-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${potY + potH + 21}" class="cw-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // gardeners
    const gardeners = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 4 - (i % 2) * 3;
      return `<g class="cw-gardener${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <ellipse cx="0" cy="-11" rx="5" ry="1.5" fill="#5a4a30"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -2 L10 -4 L11 -1 L5 1 Z" fill="#4a6a80"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cw-wrap">
        <div class="cw-head"><b>CONSERVATORY</b><span>花盆=配额窗 株高=用量 花朵=过热 园丁=会话${hotN ? " · " + hotN + " 盛放" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#121a12" rx="10"/>
          ${ribs}${pots}${gardeners}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1a241a"/>
          <text x="16" y="${H - 18}" class="cw-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="cw-ksub" text-anchor="end">拱肋=玻顶</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "温室", eyebrow: "CONSERVATORY", render };
})();
