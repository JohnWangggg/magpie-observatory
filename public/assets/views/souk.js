/* -------------------------------------------------------------------- souk
 * Souk — an open-air lane of awnings: every quota window is
 * a carpet stall (pattern density + tassel = used%, ≥85%
 * the incense burner burns amber); sessions are hawkers (a
 * turban + rug roll) unfurling the wares.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "souk";
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

    const stalls = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c08050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const stallY = floorY - 12;
      const stallW = bw - 16;
      // pattern density = f
      const patterns = Array.from({ length: Math.round(2 + f * 5) }, (_, pi) => {
        const px = x - stallW / 2 + 5 + pi * (stallW - 10) / Math.max(1, Math.round(1 + f * 5));
        return `<line x1="${px.toFixed(1)}" y1="${stallY - 24}" x2="${px.toFixed(1)}" y2="${stallY - 18}" stroke="${col}" stroke-width="1.5" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // tassel = f
      const tassel = `<line x1="${x + stallW / 2 - 4}" y1="${stallY - 20}" x2="${x + stallW / 2 - 4}" y2="${stallY - 14 - f * 4}" stroke="${col}" stroke-width="1.5"/>`;
      // incense when hot
      const incense = hot ? `<ellipse cx="${x - stallW / 2 + 4}" cy="${stallY - 26}" rx="3" ry="2" fill="var(--amber)">
          <animate attributeName="cy" values="${stallY - 26};${stallY - 32};${stallY - 26}" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="mx-stall${hot ? " hot" : ""}">
        <!-- awning -->
        <path d="M${x - stallW / 2} ${stallY - 24} L${x + stallW / 2} ${stallY - 24} L${x + stallW / 2 - 4} ${stallY - 16} L${x - stallW / 2 + 4} ${stallY - 16} Z" fill="#3a3028"/>
        ${patterns}
        <!-- rug roll -->
        <rect x="${x - stallW / 2 + 4}" y="${stallY - 16}" width="${stallW - 8}" height="8" fill="${col}" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>
        ${tassel}${incense}
        <text x="${x}" y="${stallY - 28}" class="mx-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${stallY + 10}" class="mx-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // hawkers — turban + rug roll
    const hawkers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#b08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="mx-hawker${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <ellipse cx="0" cy="-11" rx="4" ry="2" fill="#5a4030"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="4" y="-6" width="10" height="4" rx="1" fill="#8a7050"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mx-wrap">
        <div class="mx-head"><b>SOUK</b><span>毯摊=配额窗 纹密=用量 香炉=过热 商贩=会话${hotN ? " · " + hotN + " 喧" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${stalls}${hawkers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a14"/>
          <text x="16" y="${H - 18}" class="mx-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mx-ksub" text-anchor="end">巷=市巷</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "露天集", eyebrow: "SOUK", render };
})();
