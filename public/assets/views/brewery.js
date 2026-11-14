/* ------------------------------------------------------------------ brewery
 * Brewery — a line of copper stills: every quota window is a
 * mash tun (foam height/bubble glow = used%, ≥85% the steam
 * vent flares amber); sessions are brewers (a cap + apron)
 * checking the tuns along the gantry.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brewery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 50, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const tuns = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c08040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const tunY = floorY - 12;
      const tunW = bw - 18, tunH = 44;
      const foamH = 4 + f * 10;
      const bubbles = Math.round(f * 5);
      const bubbleEls = Array.from({ length: bubbles }, (_, bi) => {
        const bx = x - tunW / 3 + (bi * tunW / bubbles);
        const dur = (1.4 + bi * 0.25).toFixed(1);
        return `<circle cx="${bx.toFixed(1)}" cy="${tunY - tunH + 6}" r="${1.5 + f * 2.5}" fill="${col}" opacity=".6">
          <animate attributeName="cy" values="${tunY - tunH + 6};${tunY - tunH - 6};${tunY - tunH + 6}" dur="${dur}s" begin="${(-bi * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".6;.15;.6" dur="${dur}s" begin="${(-bi * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }).join("");
      // steam vent
      const steam = hot ? `<path d="M${x + tunW / 4} ${tunY - tunH - 8} q 2 -8 0 -14 q -2 -6 0 -12" fill="none" stroke="#cfd8dc" stroke-width="1.6" opacity=".55">
          <animate attributeName="d" values="M${x + tunW / 4} ${tunY - tunH - 8} q 2 -8 0 -14 q -2 -6 0 -12;M${x + tunW / 4} ${tunY - tunH - 14} q 2 -8 0 -14 q -2 -6 0 -12;M${x + tunW / 4} ${tunY - tunH - 8} q 2 -8 0 -14 q -2 -6 0 -12" dur="3s" repeatCount="indefinite"/></path>` : "";
      return `<g class="bw-tun${hot ? " hot" : ""}">
        <!-- tun body -->
        <path d="M${x - tunW / 2} ${tunY} L${x - tunW / 2} ${tunY - tunH} A ${tunW / 2} 6 0 0 1 ${x + tunW / 2} ${tunY - tunH} L${x + tunW / 2} ${tunY} Z"
          fill="#a07050" stroke="${hot ? "var(--amber)" : "#6a5038"}" stroke-width="${hot ? 1.4 : 1}"/>
        <ellipse cx="${x}" cy="${tunY - tunH}" rx="${tunW / 2}" ry="5" fill="#8a6040"/>
        <ellipse cx="${x}" cy="${tunY - tunH}" rx="${tunW / 2 - 4}" ry="3" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>
        ${bubbleEls}
        <!-- foam rim -->
        <ellipse cx="${x}" cy="${tunY - tunH}" rx="${tunW / 2 - 6}" ry="${foamH / 2}" fill="#f0e8d0" opacity="${(0.3 + f * 0.5).toFixed(2)}"/>
        <!-- rivets -->
        <circle cx="${x - tunW / 2 + 4}" cy="${tunY - tunH / 2}" r="1" fill="#5a4030"/>
        <circle cx="${x + tunW / 2 - 4}" cy="${tunY - tunH / 2}" r="1" fill="#5a4030"/>
        ${steam}
        <text x="${x}" y="${tunY + 12}" class="bw-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${tunY + 21}" class="bw-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + tunW / 2 - 4}" cy="${tunY - tunH - 6}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // brewers — cap + apron + paddle
    const brewers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0d0a0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="bw-brewer${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-8" stroke="${col}" stroke-width="1.5"/>
        <rect x="8" y="-10" width="3" height="4" fill="#5a4030"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bw-wrap">
        <div class="bw-head"><b>BREWERY</b><span>铜釜=配额窗 泡沫=用量 蒸汽=过热 酿酒师=会话${hotN ? " · " + hotN + " 沸" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${tuns}${brewers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="bw-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="bw-ksub" text-anchor="end">铆钉=铜皮</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酿酒坊", eyebrow: "BREWERY", render };
})();
