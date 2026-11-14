/* ---------------------------------------------------------------- laboratory
 * Laboratory — a bench of flasks & coils: every quota window
 * is a reaction vessel (liquid level + bubble = used%, ≥85%
 * the condenser burns amber); sessions are lab hands (a
 * goggles + pipette) tending the runs.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "laboratory";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 56, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const benchY = TOP + bh;

    const vessels = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60c0a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const vesY = benchY - 14;
      const vesW = bw - 24, vesH = 26;
      // liquid level = f
      const liqH = vesH * f;
      const liq = `<rect x="${x - vesW / 2}" y="${vesY - liqH}" width="${vesW}" height="${liqH}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // bubbles
      const bubbles = f > .3 ? Array.from({ length: Math.round(f * 4) }, (_, bi) => {
        const bx = x - vesW / 2 + 4 + (bi * 7) % (vesW - 8);
        return `<circle cx="${bx.toFixed(1)}" cy="${vesY - bi * 4}" r="1.2" fill="#f0f8f4" opacity=".6">
          <animate attributeName="cy" values="${vesY - bi * 4};${vesY - liqH - 4};${vesY - bi * 4}" dur="${(1.2 + bi * .3).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join("") : "";
      // condenser coil when hot
      const coil = hot ? `<path d="M${x - 4} ${vesY - vesH - 8} Q${x} ${vesY - vesH - 12} ${x + 4} ${vesY - vesH - 8} Q${x} ${vesY - vesH - 4} ${x - 4} ${vesY - vesH - 8}" fill="none" stroke="var(--amber)" stroke-width="1.2">
          <animate attributeName="opacity" values=".8;.3;.8" dur="1.3s" repeatCount="indefinite"/></path>` : "";
      // stand
      const stand = `<line x1="${x - vesW / 2 - 4}" y1="${vesY}" x2="${x - vesW / 2 - 4}" y2="${vesY - vesH - 10}" stroke="#384048" stroke-width="1.5"/>
        <line x1="${x - vesW / 2 - 4}" y1="${vesY - vesH / 2}" x2="${x - vesW / 2}" y2="${vesY - vesH / 2}" stroke="#384048" stroke-width="1"/>`;
      return `<g class="la-ves${hot ? " hot" : ""}">
        ${stand}${coil}
        <rect x="${x - vesW / 2}" y="${vesY - vesH}" width="${vesW}" height="${vesH}" rx="3" fill="#1a2228" stroke="${hot ? "var(--amber)" : "#384850"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${liq}${bubbles}
        <text x="${x}" y="${vesY + 12}" class="la-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${vesY + 21}" class="la-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // lab hands — goggles + pipette
    const hands = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#70b0a0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = benchY - 6 - (i % 2) * 3;
      return `<g class="la-hand${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-2" y="-10" width="6" height="3" rx="1" fill="#384048"/>
        <line x1="4" y1="-4" x2="10" y2="-10" stroke="${col}" stroke-width="1.2"/>
        <circle cx="10" cy="-10" r="1.5" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="la-wrap">
        <div class="la-head"><b>LABORATORY</b><span>器皿=配额窗 液位=用量 冷凝=过热 实验员=会话${hotN ? " · " + hotN + " 沸" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#101418" rx="10"/>
          ${vessels}${hands}
          <rect x="0" y="${benchY + 2}" width="${W}" height="${BOT - 2}" fill="#1c2228"/>
          <text x="16" y="${H - 18}" class="la-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="la-ksub" text-anchor="end">支架=铁架台</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "实验室", eyebrow: "LABORATORY", render };
})();
