/* --------------------------------------------------------------- caravanserai
 * Caravanserai — a walled courtyard on the silk road: every
 * quota window is an arched cell (hanging lamp + rug = used%,
 * ≥85% the fire bowl burns amber); sessions are camel drivers
 * (a turban + staff) resting their beasts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "caravanserai";
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
    const courtY = TOP + bh;

    // outer wall
    const wall = `<rect x="8" y="${TOP - 4}" width="${W - 16}" height="${courtY - TOP + 8}" fill="none" stroke="#3a3028" stroke-width="2" opacity=".5"/>`;

    const cells = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const cellY = courtY - 12;
      const cellW = bw - 18;
      const archH = 18 + f * 8;
      // hanging lamp = f
      const lampY = cellY - archH - 4;
      const lamp = `<line x1="${x}" y1="${lampY - 4}" x2="${x}" y2="${lampY}" stroke="#4a4038" stroke-width="1"/>
        <circle cx="${x}" cy="${lampY + 2}" r="2.5" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="2.5;4;2.5" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      // rug = f
      const rug = `<rect x="${x - cellW / 2 + 4}" y="${cellY - 6}" width="${cellW - 8}" height="4" fill="${col}" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      // fire bowl when hot
      const fire = hot ? `<circle cx="${x - cellW / 2 + 6}" cy="${cellY - 2}" r="3" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="gn-cell${hot ? " hot" : ""}">
        <!-- arch -->
        <path d="M${x - cellW / 2} ${cellY} L${x - cellW / 2} ${cellY - archH} Q${x} ${cellY - archH - 8} ${x + cellW / 2} ${cellY - archH} L${x + cellW / 2} ${cellY}" fill="#241c14" stroke="${hot ? "var(--amber)" : "#4a3a28"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${lamp}${rug}${fire}
        <text x="${x}" y="${cellY - archH - 10}" class="gn-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${cellY + 12}" class="gn-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // drivers — turban + staff
    const drivers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = courtY - 6 - (i % 2) * 3;
      return `<g class="gn-driver${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="0" cy="-11" rx="4" ry="2" fill="#5a4030"/>
        <line x1="4" y1="-4" x2="8" y2="-14" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gn-wrap">
        <div class="gn-head"><b>CARAVANSERAI</b><span>窑洞=配额窗 挂灯=用量 火盆=过热 驼夫=会话${hotN ? " · " + hotN + " 宿" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${wall}${cells}${drivers}
          <rect x="0" y="${courtY + 2}" width="${W}" height="${BOT - 2}" fill="#241a14"/>
          <text x="16" y="${H - 18}" class="gn-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gn-ksub" text-anchor="end">院墙=回廊</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "商队驿", eyebrow: "CARAVAN", render };
})();
