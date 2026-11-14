/* ------------------------------------------------------------------ reserve2
 * Reserve II — a wetland hide with hides: every quota window
 * is a bird hide (slit + roost = used%, ≥85% the warning
 * beacon burns amber); sessions are wardens (a binoc + vest)
 * logging the waders.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "reserve2";
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

    const hides = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#80a090";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hideY = floorY - 14;
      const hideW = bw - 20, hideH = 18;
      // slit = f
      const slit = `<rect x="${x - hideW / 2 + 4}" y="${hideY - hideH + 6}" width="${hideW - 8}" height="${3 + f * 4}" fill="#1a2420" stroke="${hot ? "var(--amber)" : "none"}" stroke-width="${hot ? 1 : 0}"/>`;
      // roost = f
      const roost = `<line x1="${x + hideW / 2 - 4}" y1="${hideY - hideH - 4}" x2="${x + hideW / 2 - 4 + f * 8}" y2="${hideY - hideH - 4}" stroke="#6a5a40" stroke-width="2"/>`;
      // beacon when hot
      const beacon = hot ? `<circle cx="${x - hideW / 2 + 4}" cy="${hideY - hideH - 6}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;4.5;3" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="re-hide${hot ? " hot" : ""}">
        <!-- hide -->
        <rect x="${x - hideW / 2}" y="${hideY - hideH}" width="${hideW}" height="${hideH}" rx="2" fill="#2a2820" stroke="${hot ? "var(--amber)" : "#4a4030"}" stroke-width="${hot ? 1.4 : .8}"/>
        <rect x="${x - hideW / 2 - 2}" y="${hideY - hideH - 4}" width="${hideW + 4}" height="4" fill="#3a3028"/>
        ${slit}${roost}${beacon}
        <text x="${x}" y="${hideY - hideH - 10}" class="re-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${hideY + 12}" class="re-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // wardens — binoc + vest
    const wardens = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#80a090");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="re-warden${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="3" y="-10" width="5" height="4" fill="#2a3038"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="re-wrap">
        <div class="re-head"><b>RESERVE II</b><span>观测=配额窗 隙=用量 栖枝=过热 守护=会话${hotN ? " · " + hotN + " 警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141412" rx="10"/>
          ${hides}${wardens}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c1a16"/>
          <text x="16" y="${H - 18}" class="re-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="re-ksub" text-anchor="end">泽=湿地</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "保护区二号", eyebrow: "RESERVE II", render };
})();
