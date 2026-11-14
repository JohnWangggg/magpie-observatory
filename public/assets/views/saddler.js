/* ------------------------------------------------------------------ saddler
 * Saddler — a tack room of saddle trees: every quota window is
 * a saddle on a rack (seat sheen + stirrup length = used%,
 * ≥85% the buckle glints amber); sessions are saddlers (a cap
 * + strap) stitching the leather.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "saddler";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const saddles = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a06030";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const rackY = floorY - 8;
      const rackW = bw - 16;
      const seatW = rackW * .7, seatH = 10;
      const stirrupLen = 6 + f * 10;
      return `<g class="sz-saddle${hot ? " hot" : ""}">
        <!-- rack -->
        <line x1="${x - rackW / 2}" y1="${rackY}" x2="${x + rackW / 2}" y2="${rackY}" stroke="#3a3028" stroke-width="3"/>
        <line x1="${x - rackW / 2 + 4}" y1="${rackY}" x2="${x - rackW / 2 + 4}" y2="${rackY + 8}" stroke="#3a3028" stroke-width="2"/>
        <line x1="${x + rackW / 2 - 4}" y1="${rackY}" x2="${x + rackW / 2 - 4}" y2="${rackY + 8}" stroke="#3a3028" stroke-width="2"/>
        <!-- saddle tree -->
        <path d="M${x - seatW / 2} ${rackY} Q${x} ${rackY - seatH - 4} ${x + seatW / 2} ${rackY} L${x + seatW / 2 - 4} ${rackY + 4} L${x - seatW / 2 + 4} ${rackY + 4} Z"
          fill="#4a3420" stroke="${hot ? "var(--amber)" : "#3a2a18"}" stroke-width="${hot ? 1.4 : .8}"/>
        <ellipse cx="${x}" cy="${rackY - 2}" rx="${seatW / 2 - 4}" ry="3" fill="${col}" opacity="${(0.3 + f * 0.5).toFixed(2)}"/>
        <!-- pommel + cantle -->
        <ellipse cx="${x - seatW / 2 + 4}" cy="${rackY - 4}" rx="4" ry="5" fill="${col}" opacity=".8"/>
        <ellipse cx="${x + seatW / 2 - 4}" cy="${rackY - 4}" rx="4" ry="5" fill="${col}" opacity=".8"/>
        <!-- stirrups -->
        <line x1="${x - seatW / 4}" y1="${rackY + 4}" x2="${x - seatW / 4}" y2="${rackY + 4 + stirrupLen}" stroke="${col}" stroke-width="1.5"/>
        <line x1="${x + seatW / 4}" y1="${rackY + 4}" x2="${x + seatW / 4}" y2="${rackY + 4 + stirrupLen}" stroke="${col}" stroke-width="1.5"/>
        <rect x="${x - seatW / 4 - 3}" y="${rackY + 4 + stirrupLen}" width="6" height="3" fill="${col}"/>
        <rect x="${x + seatW / 4 - 3}" y="${rackY + 4 + stirrupLen}" width="6" height="3" fill="${col}"/>
        <!-- buckle -->
        <rect x="${x - 3}" y="${rackY - 6}" width="6" height="4" rx="1" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.5;1" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </rect>
        <text x="${x}" y="${rackY + 24}" class="sz-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${rackY + 33}" class="sz-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // saddlers — cap + strap
    const saddlers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c09060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="sz-saddler${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-2" stroke="${col}" stroke-width="2"/>
        <line x1="9" y1="-2" x2="12" y2="-6" stroke="${col}" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sz-wrap">
        <div class="sz-head"><b>SADDLER</b><span>鞍架=配额窗 镫长=用量 鞍扣=过热 鞍匠=会话${hotN ? " · " + hotN + " 满鞍" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${saddles}${saddlers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="sz-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="sz-ksub" text-anchor="end">镫带=垂革</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞍具坊", eyebrow: "SADDLER", render };
})();
