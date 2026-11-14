/* ------------------------------------------------------------------ workshop2
 * Workshop II — a machine shop of lathes: every quota window
 * is a lathe bed (chuck spin + swarf = used%, ≥85% the
 * cutting tool burns amber); sessions are machinists (a
 * flat cap + caliper) turning the stock.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "workshop2";
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

    const lathes = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const latheY = floorY - 14;
      const bedW = bw - 16, bedH = 10;
      const chuckR = 8 + f * 4;
      // swarf = f
      const swarf = Array.from({ length: Math.round(f * 4) }, (_, si) => `<line x1="${x - 8 + si * 5}" y1="${latheY + 2}" x2="${x - 6 + si * 5}" y2="${latheY + 6}" stroke="${col}" stroke-width="1" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`).join("");
      // cutting tool when hot
      const tool = hot ? `<line x1="${x + chuckR + 4}" y1="${latheY - 14}" x2="${x + chuckR + 4}" y2="${latheY - 4}" stroke="var(--amber)" stroke-width="2">
          <animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></line>` : "";
      // chuck spin
      const spin = `<g><line x1="${x}" y1="${latheY - 4}" x2="${x + chuckR}" y2="${latheY - 4}" stroke="${col}" stroke-width="1.5">
          <animateTransform attributeName="transform" type="rotate" values="0 ${x} ${latheY - 4};360 ${x} ${latheY - 4}" dur="${(1.5 - f * .8).toFixed(2)}s" repeatCount="indefinite"/></line>
          <circle cx="${x}" cy="${latheY - 4}" r="${chuckR}" fill="none" stroke="${col}" stroke-width="1.5"/></g>`;
      return `<g class="wo-lathe${hot ? " hot" : ""}">
        <!-- bed -->
        <rect x="${x - bedW / 2}" y="${latheY}" width="${bedW}" height="${bedH}" fill="#3a3430" stroke="${hot ? "var(--amber)" : "#4a4040"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- chuck -->
        ${spin}
        <!-- tailstock -->
        <rect x="${x + bedW / 2 - 8}" y="${latheY - 6}" width="6" height="8" fill="#4a4038"/>
        ${swarf}${tool}
        <text x="${x}" y="${latheY - 20}" class="wo-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${latheY + bedH + 10}" class="wo-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // machinists — flat cap + caliper
    const machinists = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#907060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="wo-mach${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-2" y="-12" width="7" height="2" fill="#3a3030"/>
        <path d="M4 -4 L9 -10 L12 -8" stroke="${col}" stroke-width="1.2" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wo-wrap">
        <div class="wo-head"><b>WORKSHOP II</b><span>车床=配额窗 卡盘=用量 刀尖=过热 机工=会话${hotN ? " · " + hotN + " 切" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#161412" rx="10"/>
          ${lathes}${machinists}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#201c18"/>
          <text x="16" y="${H - 18}" class="wo-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="wo-ksub" text-anchor="end">床身=导轨</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "车间二号", eyebrow: "WORKSHOP II", render };
})();
