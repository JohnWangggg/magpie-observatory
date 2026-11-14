/* ----------------------------------------------------------------- printshop
 * Printshop — a room of hand presses: every quota window is a
 * press (platen press depth + ink roller = used%, ≥85% the
 * impression burns amber); sessions are printers (a cap +
 * ink apron) pulling the bar.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "printshop";
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

    const presses = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#4040a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const pressY = floorY - 14;
      const pressW = bw - 18, pressH = 34;
      const platenD = 6 + f * 12;
      const rollerX = x - pressW / 3 + f * (pressW / 3);
      return `<g class="pp-press${hot ? " hot" : ""}">
        <!-- frame -->
        <rect x="${x - pressW / 2}" y="${pressY - pressH}" width="${pressW}" height="${pressH}" rx="2" fill="#2a3038" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : .8}"/>
        <rect x="${x - pressW / 2 + 4}" y="${pressY - pressH + 4}" width="${pressW - 8}" height="8" fill="#384048"/>
        <!-- ink roller -->
        <circle cx="${rollerX.toFixed(1)}" cy="${pressY - pressH + 8}" r="4" fill="${col}" opacity=".9">
          <animate attributeName="cx" values="${(x - pressW / 3).toFixed(1)};${(x + pressW / 3).toFixed(1)};${(x - pressW / 3).toFixed(1)}" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/></circle>
        <!-- platen -->
        <rect x="${x - pressW / 4}" y="${pressY - platenD}" width="${pressW / 2}" height="${platenD}" fill="#384048"/>
        <rect x="${x - pressW / 4 + 2}" y="${pressY - platenD + 2}" width="${pressW / 2 - 4}" height="${platenD - 4}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}">
          <animate attributeName="height" values="${platenD - 4};${platenD + 4};${platenD - 4}" dur="${(1.5 + f).toFixed(1)}s" repeatCount="indefinite"/></rect>
        <!-- bed -->
        <rect x="${x - pressW / 2 + 4}" y="${pressY - 6}" width="${pressW - 8}" height="6" fill="#1a2128"/>
        <text x="${x}" y="${pressY + 14}" class="pp-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${pressY + 23}" class="pp-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + pressW / 2 - 4}" cy="${pressY - pressH - 2}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // printers — cap + ink apron + pull bar
    const printers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a0a0c0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="pp-printer${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="10" y2="-8" stroke="${col}" stroke-width="1.5"/>
        <circle cx="11" cy="-9" r="2" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pp-wrap">
        <div class="pp-head"><b>PRINTSHOP</b><span>印刷机=配额窗 压印=用量 墨辊=过热 印刷工=会话${hotN ? " · " + hotN + " 满印" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141418" rx="10"/>
          ${presses}${printers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c1c24"/>
          <text x="16" y="${H - 18}" class="pp-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="pp-ksub" text-anchor="end">拉杆=压杠</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "印刷坊", eyebrow: "PRINTSHOP", render };
})();
