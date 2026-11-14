/* -------------------------------------------------------------------- paddock
 * Paddock — a grass enclosure for yearlings: every quota
 * window is a pony at a trough (hay pile + tail swish =
 * used%, ≥85% the water trough burns amber); sessions are
 * stablehands (a flat cap + pitchfork) mucking the stalls.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "paddock";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 58, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // rail
    const rail = `<line x1="10" y1="${floorY - 20}" x2="${W - 10}" y2="${floorY - 20}" stroke="#4a3a28" stroke-width="2"/>`;

    const ponies = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ponY = floorY - 14;
      const bodyW = bw - 20, bodyH = 10;
      // hay pile = f
      const hay = `<ellipse cx="${x - bodyW / 2 - 4}" cy="${ponY - 4}" rx="${3 + f * 4}" ry="${2 + f * 3}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // trough
      const trough = `<rect x="${x + bodyW / 2 - 2}" y="${ponY - 4}" width="10" height="5" fill="#2a3038" stroke="${hot ? "var(--amber)" : "#384048"}" stroke-width="${hot ? 1.2 : .8}"/>`;
      // tail swish = f speed
      const tailDur = (1.5 - f * .8).toFixed(2);
      const tail = `<line x1="${x + bodyW / 2 - 2}" y1="${ponY - 2}" x2="${x + bodyW / 2 + 4}" y2="${ponY + 2}" stroke="${col}" stroke-width="1.5">
          <animate attributeName="x2" values="${x + bodyW / 2 + 4};${x + bodyW / 2 + 8};${x + bodyW / 2 + 4}" dur="${tailDur}s" repeatCount="indefinite"/></line>`;
      return `<g class="pu-pony${hot ? " hot" : ""}">
        ${hay}${trough}
        <ellipse cx="${x}" cy="${ponY}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="#4a3a30" stroke="${hot ? "var(--amber)" : "#3a2a20"}" stroke-width="${hot ? 1.2 : .8}"/>
        <circle cx="${x - bodyW / 2 - 2}" cy="${ponY - 3}" r="3" fill="#3a2a20"/>
        ${tail}
        <text x="${x}" y="${ponY - bodyH / 2 - 10}" class="pu-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${ponY + 14}" class="pu-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // stablehands — flat cap + pitchfork
    const hands = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#906040");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="pu-hand${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-2" y="-12" width="7" height="2" fill="#3a2a1a"/>
        <line x1="4" y1="-4" x2="9" y2="-14" stroke="${col}" stroke-width="1.2"/>
        <path d="M9 -14 L11 -10 M9 -14 L7 -10" stroke="${col}" stroke-width="1" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pu-wrap">
        <div class="pu-head"><b>PADDOCK</b><span>驹=配额窗 草堆=用量 水槽=过热 马夫=会话${hotN ? " · " + hotN + " 躁" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141410" rx="10"/>
          ${rail}${ponies}${hands}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a12"/>
          <text x="16" y="${H - 18}" class="pu-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="pu-ksub" text-anchor="end">栏=围栏</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "围场", eyebrow: "PADDOCK", render };
})();
