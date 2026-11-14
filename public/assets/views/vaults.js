/* ------------------------------------------------------------------ vaults
 * Vaults — a wall of safety-deposit boxes: every quota window
 * is a box whose fill level = used % (≥85% the brass number
 * plate burns amber); sessions are attendants wheeling a
 * trolley between the rows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vaults";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44104476);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0, plan: q.plan || ""
    }))).sort((a, b) => b.used - a.used).slice(0, 8);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 3);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 38, BOT = 44;
    const cols = 4, rows = Math.ceil(quotas.length / cols);
    const bw = (W - 40) / cols, bh = Math.min(90, (H - TOP - BOT) / rows);

    const boxes = quotas.map((w, i) => {
      const cc = i % cols, row = Math.floor(i / cols);
      const x = 16 + cc * bw;
      const y = TOP + row * (bh + 4);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8ab4f8";
      const fillH = (bh - 20) * f;
      const num = String(Math.round(w.used)).padStart(3, "0");
      return `<g class="vu-box${hot ? " hot" : ""}">
        <rect x="${x}" y="${y}" width="${bw - 8}" height="${bh}" rx="4"
          fill="color-mix(in srgb, var(--card-2) 70%, #283038)" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : .8}"/>
        <rect x="${x + 4}" y="${y + 4}" width="${bw - 16}" height="${(bh - 20 - fillH).toFixed(1)}" rx="2" fill="color-mix(in srgb, ${col} 18%, transparent)"/>
        <rect x="${x + 4}" y="${(y + 4 + bh - 20 - fillH).toFixed(1)}" width="${bw - 16}" height="${fillH.toFixed(1)}" rx="2" fill="${col}" opacity=".8"/>
        <circle cx="${x + bw / 2 - 4}" cy="${y + bh - 8}" r="4" fill="none" stroke="${hot ? "var(--amber)" : "#c8a860"}" stroke-width="1.2"/>
        <text x="${x + bw / 2 - 4}" y="${y + bh - 6}" class="vu-num" text-anchor="middle">${num}</text>
        <text x="${x + 4}" y="${y + 12}" class="vu-name">${esc(w.name.slice(0, 6))}</text>
        <text x="${x + 4}" y="${y + bh - 16}" class="vu-prov">${esc((m.name || w.prov).slice(0, 7))}</text>
        ${hot ? `<circle cx="${x + bw - 14}" cy="${y + 10}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // attendants — trolley wheels between rows
    const trolleys = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 18 - (s.tps || 0) / 10);
      const y = TOP + (i * bh + bh / 2) % (H - TOP - BOT);
      const col = dead ? "var(--red)" : (m.color || "#c8a860");
      return `<g class="vu-trolley${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y.toFixed(1)};${W + 30} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <rect x="-10" y="-8" width="20" height="8" rx="2" fill="${col}" opacity=".9"/>
        <circle cx="-5" cy="2" r="3" fill="#384048"/><circle cx="5" cy="2" r="3" fill="#384048"/>
        <line x1="10" y1="-8" x2="14" y2="-12" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vu-wrap">
        <div class="vu-head"><b>VAULTS</b><span>保管箱=配额窗 满度=用量 推车=会话${hotN ? " · " + hotN + " 燃牌" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${boxes}${trolleys}
          <text x="16" y="${H - 18}" class="vu-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="vu-ksub" text-anchor="end">铜圈=箱号</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "金库", eyebrow: "VAULTS", render };
})();
